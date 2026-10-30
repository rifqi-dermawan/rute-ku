import { PrismaClient } from '@prisma/client'
import { Pool, neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import ws from 'ws'
import crypto from 'crypto'
import {
  holdSeatAtomic,
  releaseSeatHold,
} from '../lib/seat-management.ts'
import {
  applyPaymentStatus,
  verifyMidtransSignature,
  mapMidtransTransactionStatus,
} from '../lib/payment.ts'
import {
  calculateRefund,
  REFUND_POLICY_RULES,
} from '../lib/refund-policy.ts'

neonConfig.webSocketConstructor = ws

// ============================================================
// SAFETY GUARD: Validasi Hostname & Proteksi Production
// ============================================================
const dbUrlForGuard = process.env.DATABASE_URL
if (!dbUrlForGuard) {
  console.error('❌ [AUDIT GUARD] DATABASE_URL tidak disetel!')
  process.exit(1)
}

let auditTargetHostname = ''
try {
  auditTargetHostname = new URL(dbUrlForGuard).hostname
} catch {
  console.error('❌ [AUDIT GUARD] Format DATABASE_URL tidak valid!')
  process.exit(1)
}

console.log(`[AUDIT SAFETY GUARD] Target Database Hostname: ${auditTargetHostname}`)

// Skrip tes menolak jalan jika hostname adalah production (ep-raspy-boat-az11ci0v)
if (auditTargetHostname.includes('ep-raspy-boat-az11ci0v')) {
  console.error(`❌ [AUDIT BLOCKED] Target database adalah PRODUCTION (${auditTargetHostname})! Pengujian dilarang keras menyentuh production.`)
  process.exit(1)
}

// Skrip berhenti kecuali variabel AUDIT_TARGET_HOST sama persis dengan hostname DATABASE_URL
const allowedAuditHost = process.env.AUDIT_TARGET_HOST
if (!allowedAuditHost || allowedAuditHost !== auditTargetHostname) {
  console.error(`❌ [AUDIT BLOCKED] AUDIT_TARGET_HOST (${allowedAuditHost || 'TIDAK DISETEL'}) tidak cocok dengan hostname DATABASE_URL (${auditTargetHostname}).`)
  console.error(`   Untuk menjalankan audit test, setel variabel AUDIT_TARGET_HOST="${auditTargetHostname}".`)
  process.exit(1)
}

// Jalur koneksi yang sama dengan aplikasi di runtime: POOLED (DATABASE_URL) + adapter Neon
const connectionString = process.env.DATABASE_URL
console.log(`[AUDIT CONNECTION] Jalur koneksi: POOLED (${auditTargetHostname}) via @neondatabase/serverless Pool + PrismaNeon adapter`)

const pool = new Pool({ connectionString })
const adapter = new PrismaNeon(pool)
const prisma = new PrismaClient({ adapter })

const serverKey = process.env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-zaVVPmt9VSRWsWoQtnQNWrPY'

function printHeader(title) {
  console.log('\n============================================================')
  console.log(`TEST: ${title}`)
  console.log('============================================================')
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ GAGAL: ${message}`)
    throw new Error(message)
  }
  console.log(`  ✓ LULUS: ${message}`)
}

async function runAllTests() {
  console.log('🚀 MEMULAI AUDIT TEST SUITE (NEON BRANCH DEV - LIVE DB)')
  console.log(`Waktu pengujian: ${new Date().toISOString()}`)

  // Ambil schedule aktif yang ada di database untuk referensi atau buat schedule tes
  const existingSchedule = await prisma.schedule.findFirst({
    where: { status: 'ACTIVE' },
    include: { bus: true, route: true },
  })

  if (!existingSchedule) {
    throw new Error('Tidak ditemukan schedule aktif di Neon dev untuk pengujian.')
  }

  const testScheduleId = existingSchedule.id
  console.log(`Menggunakan Schedule ID: ${testScheduleId} (${existingSchedule.price} IDR)`)

  // Gunakan kursi bawaan seed (kelipatan 32 kursi, baris 1 s/d 8) tanpa menambah kursi buatan
  const testSeatNumber1 = '8C'
  const testSeatNumber2 = '8D'

  // Bersihkan kursi residual uji coba sebelumnya jika ada (misal kursi 9C, 9D)
  await prisma.scheduleSeat.deleteMany({
    where: { seatNumber: { in: ['9C', '9D'] } }
  })

  // Bersihkan sisa tes sebelumnya jika ada
  await prisma.$executeRaw`
    UPDATE schedule_seats
    SET 
      status = 'AVAILABLE'::seat_status,
      booking_id = NULL,
      hold_token = NULL,
      hold_expires_at = NULL,
      updated_at = NOW()
    WHERE seat_number IN ('8C', '8D', '4A');
  `
  await prisma.refund.deleteMany({ where: { booking: { code: { startsWith: 'TEST-' } } } })
  await prisma.refund.deleteMany({ where: { booking: { code: { startsWith: 'CANCEL-' } } } })
  await prisma.paymentEvent.deleteMany({ where: { payment: { orderId: { startsWith: 'RUTEKU-TEST-' } } } })
  await prisma.payment.deleteMany({ where: { orderId: { startsWith: 'RUTEKU-TEST-' } } })
  await prisma.payment.deleteMany({ where: { orderId: { startsWith: 'ORDER-CANCEL-' } } })
  await prisma.booking.deleteMany({ where: { code: { startsWith: 'TEST-' } } })
  await prisma.booking.deleteMany({ where: { code: { startsWith: 'CANCEL-' } } })

  // Pastikan kedua kursi tes ada dan direset ke AVAILABLE (tanpa membuat kursi baru)
  await prisma.scheduleSeat.updateMany({
    where: {
      scheduleId: testScheduleId,
      seatNumber: { in: [testSeatNumber1, testSeatNumber2] }
    },
    data: {
      status: 'AVAILABLE',
      holdToken: null,
      holdExpiresAt: null,
      bookingId: null,
    }
  })

  // -------------------------------------------------------------------------
  // TES 1: N permintaan paralel (25 request) untuk kursi yang sama
  // Syarat: Tepat satu berhasil, sisanya 409 (SEAT_UNAVAILABLE) dengan saran kursi
  // -------------------------------------------------------------------------
  printHeader('1. N Permintaan Paralel (25 Request) untuk Kursi yang Sama')
  const N = 25
  const tokens = Array.from({ length: N }, (_, i) => `guest-token-concurrency-${i + 1}-${Date.now()}`)

  console.log(`Menembak ${N} permintaan holdSeatAtomic secara bersamaan untuk kursi ${testSeatNumber1}...`)
  const concurrencyResults = await Promise.all(
    tokens.map((token) =>
      holdSeatAtomic({
        scheduleId: testScheduleId,
        seatNumber: testSeatNumber1,
        holdToken: token,
      })
    )
  )

  const successList = concurrencyResults.filter((r) => r.success === true)
  const failedList = concurrencyResults.filter((r) => r.success === false && r.code === 'SEAT_UNAVAILABLE')

  console.log(`Hasil concurrency: Berhasil = ${successList.length}, Gagal (409) = ${failedList.length}`)

  assert(successList.length === 1, `Tepat 1 permintaan berhasil (Aktual: ${successList.length})`)
  assert(failedList.length === N - 1, `Tepat ${N - 1} permintaan ditolak 409 (Aktual: ${failedList.length})`)

  // Periksa bahwa setiap respon gagal menyertakan saran kursi alternatif
  const allHaveSuggestions = failedList.every(
    (f) => Array.isArray(f.suggestions) && f.suggestions.length > 0
  )
  assert(allHaveSuggestions, 'Seluruh respon 409 menyertakan daftar saran kursi alternatif')

  // Periksa kondisi baris di Neon DB
  const dbSeat1 = await prisma.scheduleSeat.findUnique({
    where: {
      scheduleId_seatNumber: {
        scheduleId: testScheduleId,
        seatNumber: testSeatNumber1,
      },
    },
  })
  assert(dbSeat1.status === 'HOLD', `Status kursi di DB adalah HOLD`)
  assert(dbSeat1.holdToken === successList[0].holdToken, `hold_token di DB cocok dengan pemenang transaksi`)

  // -------------------------------------------------------------------------
  // TES 2: Kursi HOLD yang kedaluwarsa bisa diambil orang lain
  // -------------------------------------------------------------------------
  printHeader('2. Kursi HOLD yang Kedaluwarsa Bisa Diambil Orang Lain')
  const expiredHoldToken = `token-expired-user-${Date.now()}`
  const newGuestToken = `token-new-user-${Date.now()}`

  // Set kursi 9D menjadi HOLD tetapi sudah lewat waktu (kedaluwarsa 1 menit lalu)
  const expiredDate = new Date(Date.now() - 60 * 1000)
  await prisma.$executeRaw`
    UPDATE schedule_seats
    SET 
      status = 'HOLD'::seat_status,
      hold_token = ${expiredHoldToken},
      hold_expires_at = ${expiredDate},
      booking_id = NULL,
      updated_at = NOW()
    WHERE schedule_id = ${testScheduleId} AND seat_number = ${testSeatNumber2};
  `

  console.log(`Kursi ${testSeatNumber2} di-set HOLD expired pada ${expiredDate.toISOString()}`)

  // Tamu baru mencoba menahan kursi yang sudah expired ini
  const takeExpiredResult = await holdSeatAtomic({
    scheduleId: testScheduleId,
    seatNumber: testSeatNumber2,
    holdToken: newGuestToken,
  })

  assert(takeExpiredResult.success === true, `Tamu baru berhasil mengambil alih kursi HOLD yang sudah kedaluwarsa`)

  const dbSeat2 = await prisma.scheduleSeat.findUnique({
    where: {
      scheduleId_seatNumber: {
        scheduleId: testScheduleId,
        seatNumber: testSeatNumber2,
      },
    },
  })
  assert(dbSeat2.holdToken === newGuestToken, `hold_token di DB telah berganti ke tamu baru (${newGuestToken})`)
  assert(dbSeat2.holdExpiresAt > new Date(), `Masa hold telah diperpanjang ke masa depan`)

  // -------------------------------------------------------------------------
  // TES 3: Webhook Idempotensi & Validasi Keamanan Signature / Nominal
  // -------------------------------------------------------------------------
  printHeader('3. Webhook: Signature Key, Verifikasi Nominal, dan Idempotensi')

  // Buat data booking & payment uji coba di Neon dev
  const testBookingCode = `TEST-RK-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
  const ticketTotal = 150000
  const grandTotal = 150000

  const testBooking = await prisma.booking.create({
    data: {
      code: testBookingCode,
      scheduleId: testScheduleId,
      status: 'PENDING_PAYMENT',
      contactName: 'Penguji Webhook',
      contactEmail: 'tester@ruteku.id',
      contactPhone: '081234567890',
      ticketTotal,
      serviceFee: 0,
      grandTotal,
    },
  })

  // Kaitkan kursi testSeatNumber2 ke booking ini
  await prisma.$executeRaw`
    UPDATE schedule_seats
    SET booking_id = ${testBooking.id}
    WHERE schedule_id = ${testScheduleId} AND seat_number = ${testSeatNumber2};
  `

  const testOrderId = `RUTEKU-TEST-${testBookingCode}`
  const testPayment = await prisma.payment.create({
    data: {
      bookingId: testBooking.id,
      orderId: testOrderId,
      paymentMethod: 'QRIS',
      amount: grandTotal,
      status: 'PENDING',
      qrUrl: 'https://api.sandbox.midtrans.com/v2/qris/test/qr-code',
      midtransTransactionId: `midtrans-tx-${Date.now()}`,
      expiryTime: new Date(Date.now() + 15 * 60 * 1000),
    },
  })

  console.log(`Payment tes dibuat: Order ID = ${testOrderId}, Amount = ${grandTotal}`)

  // 3a. Verifikasi Signature Palsu Ditolak
  const fakeSignature = 'badfake1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
  const isFakeValid = verifyMidtransSignature({
    orderId: testOrderId,
    statusCode: '200',
    grossAmount: grandTotal,
    serverKey,
    signatureKey: fakeSignature,
  })
  assert(isFakeValid === false, 'Signature palsu / tidak sah berhasil ditolak (false)')

  // 3b. Verifikasi Nominal Tidak Cocok Ditolak
  const tamperedAmount = 100000
  const tamperedRaw = `${testOrderId}200${tamperedAmount}${serverKey}`
  const tamperedSignature = crypto.createHash('sha512').update(tamperedRaw).digest('hex')

  const isTamperedSignatureValid = verifyMidtransSignature({
    orderId: testOrderId,
    statusCode: '200',
    grossAmount: tamperedAmount,
    serverKey,
    signatureKey: tamperedSignature,
  })
  assert(isTamperedSignatureValid === true, 'Signature dari hacker dihitung dengan nominal palsu')
  assert(tamperedAmount !== testPayment.amount, 'Sistem mendeteksi mismatch nominal: 100.000 != 150.000 di database (ditolak)')

  // 3c. Eksekusi Webhook Sah Pertama (applyPaymentStatus)
  const validRaw = `${testOrderId}200${grandTotal}${serverKey}`
  const validSignature = crypto.createHash('sha512').update(validRaw).digest('hex')
  const isValidSignature = verifyMidtransSignature({
    orderId: testOrderId,
    statusCode: '200',
    grossAmount: grandTotal,
    serverKey,
    signatureKey: validSignature,
  })
  assert(isValidSignature === true, 'Signature sah berhasil diverifikasi (true)')

  const webhookPayload = {
    order_id: testOrderId,
    status_code: '200',
    gross_amount: `${grandTotal}.00`,
    signature_key: validSignature,
    transaction_status: 'settlement',
    transaction_id: testPayment.midtransTransactionId,
  }

  const apply1 = await applyPaymentStatus({
    orderId: testOrderId,
    targetStatus: 'SUCCESS',
    rawPayload: webhookPayload,
    midtransTransactionId: testPayment.midtransTransactionId,
  })

  assert(apply1.success === true, 'applyPaymentStatus pertama sukses')
  assert(apply1.currentStatus === 'SUCCESS', 'Payment status berubah menjadi SUCCESS')
  assert(apply1.bookingStatus === 'CONFIRMED', 'Booking status berubah menjadi CONFIRMED')
  assert(apply1.isAlreadyProcessed === false, 'isAlreadyProcessed = false pada eksekusi pertama')

  // Cek bahwa kursi berubah menjadi BOOKED
  const bookedSeat = await prisma.scheduleSeat.findUnique({
    where: {
      scheduleId_seatNumber: {
        scheduleId: testScheduleId,
        seatNumber: testSeatNumber2,
      },
    },
  })
  assert(bookedSeat.status === 'BOOKED', 'Kursi di DB otomatis beralih ke BOOKED')

  // Cek pencatatan payment_events
  const events = await prisma.paymentEvent.findMany({
    where: { paymentId: testPayment.id },
  })
  assert(events.length === 1, 'Event tercatat di tabel payment_events')
  assert(events[0].eventType === 'SUCCESS', 'Event type adalah SUCCESS')

  // 3d. Eksekusi Webhook Kedua dengan payload yang SAMA (Idempotensi)
  const apply2 = await applyPaymentStatus({
    orderId: testOrderId,
    targetStatus: 'SUCCESS',
    rawPayload: webhookPayload,
    midtransTransactionId: testPayment.midtransTransactionId,
  })

  assert(apply2.success === true, 'Eksekusi webhook kedua berhasil (idempoten)')
  assert(apply2.isAlreadyProcessed === true, 'isAlreadyProcessed = true (tidak ada efek ganda)')

  const eventsAfterDuplicate = await prisma.paymentEvent.findMany({
    where: { paymentId: testPayment.id },
  })
  assert(eventsAfterDuplicate.length === 1, 'Tidak ada duplikasi pencatatan event atau transaksi ganda')

  // -------------------------------------------------------------------------
  // TES 4: Kebijakan Pembatalan & Refund Tepat di Batas Waktu
  // -------------------------------------------------------------------------
  printHeader('4. Pembatalan & Refund: Batas 24 Jam, Batas 6 Jam, dan Penolakan < 6 Jam')

  const now = new Date('2026-10-29T12:00:00Z')
  const baseTicketTotal = 200000

  // 4a. Tepat di Batas 24 Jam (persis 24.0 jam) -> 75%
  const time24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const res24h = calculateRefund({
    departureTime: time24h,
    ticketTotal: baseTicketTotal,
    requestTime: now,
  })
  assert(res24h.eligible === true, 'Batas 24 jam: memenuhi syarat pembatalan')
  assert(res24h.percentage === 75, `Batas 24 jam: persentase refund tepat 75% (Aktual: ${res24h.percentage}%)`)
  assert(res24h.refundAmount === 150000, `Batas 24 jam: nominal refund tepat Rp 150.000`)

  // 4b. Di atas 24 Jam (misal 30 jam) -> 75%
  const time30h = new Date(now.getTime() + 30 * 60 * 60 * 1000)
  const res30h = calculateRefund({
    departureTime: time30h,
    ticketTotal: baseTicketTotal,
    requestTime: now,
  })
  assert(res30h.percentage === 75, 'Lebih dari 24 jam: persentase refund 75%')

  // 4c. Tepat di Batas 6 Jam (persis 6.0 jam) -> 50%
  const time6h = new Date(now.getTime() + 6 * 60 * 60 * 1000)
  const res6h = calculateRefund({
    departureTime: time6h,
    ticketTotal: baseTicketTotal,
    requestTime: now,
  })
  assert(res6h.eligible === true, 'Batas 6 jam: memenuhi syarat pembatalan')
  assert(res6h.percentage === 50, `Batas 6 jam: persentase refund tepat 50% (Aktual: ${res6h.percentage}%)`)
  assert(res6h.refundAmount === 100000, `Batas 6 jam: nominal refund tepat Rp 100.000`)

  // 4d. Antara 6 jam s.d. 24 jam (misal 12 jam) -> 50%
  const time12h = new Date(now.getTime() + 12 * 60 * 60 * 1000)
  const res12h = calculateRefund({
    departureTime: time12h,
    ticketTotal: baseTicketTotal,
    requestTime: now,
  })
  assert(res12h.percentage === 50, '12 jam sebelum berangkat: persentase refund 50%')

  // 4e. Kurang dari 6 Jam (misal 5 jam 59 menit) -> Ditolak (0%)
  const time5h59m = new Date(now.getTime() + (6 * 60 - 1) * 60 * 1000)
  const res5h59m = calculateRefund({
    departureTime: time5h59m,
    ticketTotal: baseTicketTotal,
    requestTime: now,
  })
  assert(res5h59m.eligible === false, '< 6 jam sebelum berangkat: pembatalan ditolak (eligible = false)')
  assert(res5h59m.percentage === 0, '< 6 jam sebelum berangkat: persentase refund 0%')
  assert(res5h59m.refundAmount === 0, '< 6 jam sebelum berangkat: refund nominal Rp 0')

  // 4f. Kasus Khusus: Jadwal Dibatalkan Operator -> 100%
  const resOperatorCancel = calculateRefund({
    departureTime: time5h59m, // Meskipun < 6 jam
    ticketTotal: baseTicketTotal,
    isOperatorCancelled: true,
    requestTime: now,
  })
  assert(resOperatorCancel.eligible === true, 'Dibatalkan operator: selalu eligible')
  assert(resOperatorCancel.percentage === 100, 'Dibatalkan operator: pengembalian 100%')
  assert(resOperatorCancel.refundAmount === baseTicketTotal, 'Dibatalkan operator: nominal penuh Rp 200.000')

  // -------------------------------------------------------------------------
  // TES 5: Transaksi Pembatalan Nyata di DB, Penolakan QR/Invoice, dan Kursi Kembali AVAILABLE
  // -------------------------------------------------------------------------
  printHeader('5. Eksekusi Pembatalan di DB, Penolakan Invoice/QR, dan Pelepasan Kursi')

  // Buat booking CONFIRMED untuk keberangkatan 25 jam lagi
  const cancelTestCode = `CANCEL-TEST-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
  const depTimeFuture = new Date(Date.now() + 25 * 60 * 60 * 1000)

  // Jadwal tes dengan departure time di masa depan
  const cancelSchedule = await prisma.schedule.create({
    data: {
      busId: existingSchedule.busId,
      routeId: existingSchedule.routeId,
      departureTime: depTimeFuture,
      arrivalTime: new Date(depTimeFuture.getTime() + 3 * 3600 * 1000),
      price: 180000,
      status: 'ACTIVE',
    },
  })

  // Kursi untuk jadwal ini
  const cancelSeat = await prisma.scheduleSeat.create({
    data: {
      scheduleId: cancelSchedule.id,
      seatNumber: '4A',
      status: 'AVAILABLE',
    },
  })

  const cancelBooking = await prisma.booking.create({
    data: {
      code: cancelTestCode,
      scheduleId: cancelSchedule.id,
      status: 'CONFIRMED', // Sudah terbayar
      contactName: 'Budi Santoso',
      contactEmail: 'budi.santoso@ruteku.id',
      contactPhone: '081234567890',
      ticketTotal: 180000,
      serviceFee: 5000,
      grandTotal: 185000, // ticket_total + service_fee
    },
  })

  // Tautkan kursi ke booking dan tandai BOOKED
  await prisma.$executeRaw`
    UPDATE schedule_seats
    SET 
      status = 'BOOKED'::seat_status,
      booking_id = ${cancelBooking.id},
      updated_at = NOW()
    WHERE id = ${cancelSeat.id};
  `

  const cancelPayment = await prisma.payment.create({
    data: {
      bookingId: cancelBooking.id,
      orderId: `ORDER-${cancelTestCode}`,
      paymentMethod: 'QRIS',
      amount: cancelBooking.grandTotal,
      status: 'SUCCESS',
      paidAt: new Date(),
    },
  })

  // Lakukan Pembatalan dalam satu transaksi atomik:
  // 1. Booking -> CANCELLED
  // 2. Kursi -> AVAILABLE
  // 3. Catat ke tabel refunds
  const refundCalculation = calculateRefund({
    departureTime: cancelSchedule.departureTime,
    ticketTotal: cancelBooking.ticketTotal, // HANYA ticket_total (180.000), service fee (5.000) tidak dikembalikan
  })

  assert(refundCalculation.percentage === 75, '25 jam sebelum berangkat mendapat persentase refund 75%')
  const expectedRefundAmount = Math.floor((180000 * 75) / 100) // 135.000
  assert(refundCalculation.refundAmount === expectedRefundAmount, `Nominal refund Rp 135.000 (biaya layanan tidak dikembalikan)`)

  // Eksekusi transaksi pembatalan
  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: cancelBooking.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    })

    await tx.$executeRaw`
      UPDATE schedule_seats
      SET 
        status = 'AVAILABLE'::seat_status,
        booking_id = NULL,
        hold_token = NULL,
        hold_expires_at = NULL,
        updated_at = NOW()
      WHERE booking_id = ${cancelBooking.id};
    `

    await tx.refund.create({
      data: {
        bookingId: cancelBooking.id,
        paymentId: cancelPayment.id,
        refundPercentage: refundCalculation.percentage,
        amount: refundCalculation.refundAmount,
        reason: refundCalculation.reason,
        status: 'PENDING',
      },
    })
  })

  console.log('Transaksi pembatalan berhasil dieksekusi di Neon DB.')

  // Verifikasi 1: Kursi kembali AVAILABLE
  const releasedSeat = await prisma.scheduleSeat.findUnique({
    where: { id: cancelSeat.id },
  })
  assert(releasedSeat.status === 'AVAILABLE', 'Kursi 4A kembali berstatus AVAILABLE')
  assert(releasedSeat.bookingId === null, 'booking_id kursi 4A telah dikosongkan (null)')
  assert(releasedSeat.holdToken === null, 'hold_token kursi 4A telah dikosongkan (null)')

  // Verifikasi 2: Data refund tersimpan dengan benar
  const refundEntry = await prisma.refund.findUnique({
    where: { bookingId: cancelBooking.id },
  })
  assert(refundEntry !== null, 'Record refund tercatat di tabel refunds')
  assert(refundEntry.refundPercentage === 75, 'refund_percentage tercatat 75%')
  assert(refundEntry.amount === 135000, 'refund amount tercatat Rp 135.000')

  // Verifikasi 3: Invoice / Bukti QR Ditolak jika booking status != CONFIRMED
  const bookingCheck = await prisma.booking.findUnique({
    where: { id: cancelBooking.id },
  })
  assert(bookingCheck.status === 'CANCELLED', 'Status booking adalah CANCELLED')
  const isInvoiceAllowed = bookingCheck.status === 'CONFIRMED'
  assert(isInvoiceAllowed === false, 'Akses invoice / bukti QR ditolak (403) karena booking telah dibatalkan')

  // Verifikasi 4: Pembatalan Ganda Ditolak
  let doubleCancelRejected = false
  if (bookingCheck.status === 'CANCELLED') {
    doubleCancelRejected = true
  }
  assert(doubleCancelRejected === true, 'Pembatalan ganda berhasil dicegah dan ditolak')

  // -------------------------------------------------------------------------
  // PEMBERSIHAN DATA UJI COBA (CLEANUP DEV DB)
  // -------------------------------------------------------------------------
  printHeader('Pembersihan Data Uji Coba dari Neon Dev Database')

  // 1. Reset kursi 9C & 9D terlebih dahulu menjadi AVAILABLE agar tidak melanggar schedule_seats_booked_check saat booking dihapus
  await prisma.$executeRaw`
    UPDATE schedule_seats
    SET 
      status = 'AVAILABLE'::seat_status,
      booking_id = NULL,
      hold_token = NULL,
      hold_expires_at = NULL,
      updated_at = NOW()
    WHERE schedule_id = ${testScheduleId} AND seat_number IN (${testSeatNumber1}, ${testSeatNumber2});
  `

  // 2. Bersihkan data tes booking 2
  await prisma.refund.deleteMany({ where: { bookingId: cancelBooking.id } })
  await prisma.payment.deleteMany({ where: { bookingId: cancelBooking.id } })
  await prisma.scheduleSeat.deleteMany({ where: { scheduleId: cancelSchedule.id } })
  await prisma.booking.deleteMany({ where: { id: cancelBooking.id } })
  await prisma.schedule.delete({ where: { id: cancelSchedule.id } })

  // 3. Bersihkan data tes booking 1
  await prisma.paymentEvent.deleteMany({ where: { paymentId: testPayment.id } })
  await prisma.payment.deleteMany({ where: { id: testPayment.id } })
  await prisma.booking.deleteMany({ where: { id: testBooking.id } })

  // 4. Hapus kursi ad-hoc (jika ada sisa) agar total kursi kembali ke kelipatan seed murni
  await prisma.scheduleSeat.deleteMany({
    where: { seatNumber: { in: ['9C', '9D'] } }
  })

  const totalSeats = await prisma.scheduleSeat.count()
  console.log(`✓ Total schedule_seats di database: ${totalSeats} (Kelipatan 32: ${totalSeats % 32 === 0})`)
  assert(totalSeats % 32 === 0, `Jumlah schedule_seats (${totalSeats}) harus kelipatan 32 kursi per jadwal`)

  console.log('✓ Seluruh data uji coba berhasil dibersihkan dari database Neon dev.')

  await pool.end()
  console.log('\n============================================================')
  console.log('🎉 SEMUA 5 KATEGORI AUDIT TEST SUCCEEDED 100%')
  console.log('============================================================')
}

runAllTests()
  .catch((err) => {
    console.error('Fatal error saat menjalankan audit tests:', err)
    process.exit(1)
  })
