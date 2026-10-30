import { PrismaClient } from '@prisma/client'
import { Pool, neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import ws from 'ws'
import { applyPaymentStatus, mapMidtransTransactionStatus } from '../lib/payment.ts'

neonConfig.webSocketConstructor = ws

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('❌ DATABASE_URL tidak disetel.')
  process.exit(1)
}

const pool = new Pool({ connectionString })
const adapter = new PrismaNeon(pool)
const prisma = new PrismaClient({ adapter })

const serverKey = process.env.MIDTRANS_SERVER_KEY
if (!serverKey) {
  console.error('❌ MIDTRANS_SERVER_KEY tidak ditemukan.')
  process.exit(1)
}

async function runRealQrisE2ETest() {
  console.log('============================================================')
  console.log('🧪 UJI END-TO-END SUNGGUHAN: QRIS MIDTRANS SANDBOX & SIMULATOR')
  console.log('============================================================')

  // 1. Ambil jadwal aktif dan kursi 8A
  const schedule = await prisma.schedule.findFirst({
    where: { status: 'ACTIVE' },
    include: { route: true, bus: true },
  })

  if (!schedule) {
    throw new Error('Tidak ada schedule aktif di database.')
  }

  const testSeatNumber = '8A'

  // Bersihkan data tes lama jika ada
  await prisma.paymentEvent.deleteMany({
    where: { payment: { orderId: { startsWith: 'RUTEKU-E2E-' } } },
  })
  await prisma.payment.deleteMany({
    where: { orderId: { startsWith: 'RUTEKU-E2E-' } },
  })
  await prisma.bookingPassenger.deleteMany({
    where: { booking: { code: { startsWith: 'RK-E2E-' } } },
  })
  await prisma.booking.deleteMany({
    where: { code: { startsWith: 'RK-E2E-' } },
  })

  // Reset kursi tes ke AVAILABLE
  await prisma.scheduleSeat.update({
    where: {
      scheduleId_seatNumber: {
        scheduleId: schedule.id,
        seatNumber: testSeatNumber,
      },
    },
    data: {
      status: 'AVAILABLE',
      bookingId: null,
      holdToken: null,
      holdExpiresAt: null,
    },
  })

  // 2. Buat booking baru di database
  const bookingCode = `RK-E2E-${Date.now().toString(36).toUpperCase()}`
  const testBooking = await prisma.booking.create({
    data: {
      code: bookingCode,
      publicToken: crypto.randomUUID(),
      scheduleId: schedule.id,
      ticketTotal: schedule.price,
      serviceFee: 5000,
      grandTotal: schedule.price + 5000,
      contactName: 'Penumpang E2E Test',
      contactEmail: 'e2e-test@ruteku.id',
      contactPhone: '081234567890',
      status: 'PENDING_PAYMENT',
      passengers: {
        create: [
          {
            fullName: 'Penumpang E2E Test',
            passengerType: 'adult',
            seatNumber: testSeatNumber,
          },
        ],
      },
    },
  })

  console.log(`✓ Booking uji coba berhasil dibuat: Kode = ${testBooking.code}, Grand Total = Rp ${testBooking.grandTotal.toLocaleString('id-ID')}`)

  // 3. Panggil API Midtrans Charge QRIS (seperti pada /api/payment/qris)
  const orderId = `RUTEKU-E2E-${Date.now()}`
  const authString = Buffer.from(`${serverKey.trim()}:`).toString('base64')

  const chargeResponse = await fetch('https://api.sandbox.midtrans.com/v2/charge', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Basic ${authString}`,
    },
    body: JSON.stringify({
      payment_type: 'qris',
      transaction_details: {
        order_id: orderId,
        gross_amount: testBooking.grandTotal,
      },
    }),
  })

  const chargeData = await chargeResponse.json()
  const qrUrl = chargeData.actions?.find((a) => a.name === 'generate-qr-code')?.url

  console.log(`\n--- HASIL PEMANGGILAN /api/payment/qris ---`)
  console.log(`Status Code HTTP : ${chargeResponse.status}`)
  console.log(`Apakah qr_url terisi : ${Boolean(qrUrl) ? 'YA (Terisi)' : 'TIDAK'}`)
  console.log(`Order ID : ${orderId}`)
  console.log(`QR Image URL : ${qrUrl}`)

  if (!qrUrl) {
    throw new Error(`Gagal mendapatkan QR Code dari Midtrans Sandbox: ${JSON.stringify(chargeData)}`)
  }

  // Simpan record payment ke database
  const payment = await prisma.payment.create({
    data: {
      orderId,
      bookingId: testBooking.id,
      paymentMethod: 'qris',
      status: 'PENDING',
      amount: testBooking.grandTotal,
      midtransTransactionId: chargeData.transaction_id,
      qrUrl,
    },
  })

  // Hubungkan kursi dengan booking
  await prisma.scheduleSeat.update({
    where: {
      scheduleId_seatNumber: {
        scheduleId: schedule.id,
        seatNumber: testSeatNumber,
      },
    },
    data: {
      status: 'HOLD',
      holdToken: crypto.randomUUID(),
      bookingId: testBooking.id,
      holdExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  })

  // 4. Bayar melalui QRIS Simulator v2 (simulator.sandbox.midtrans.com/v2/qris/index)
  console.log(`\n--- PROSES PEMBAYARAN LEWAT QRIS SIMULATOR v2 ---`)
  console.log(`Mengirim URL gambar QR ke: https://simulator.sandbox.midtrans.com/v2/qris/payment`)

  const simStep1 = await fetch('https://simulator.sandbox.midtrans.com/v2/qris/payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ qrCodeUrl: qrUrl }),
  })

  const simHtml = await simStep1.text()
  const refIdMatch = simHtml.match(/name="referenceId"\s+type="hidden"\s+value="([^"]+)"/)
  const exploreDataMatch = simHtml.match(/name="exploreData"\s+type="hidden"\s+value="([^"]+)"/)

  if (!refIdMatch || !exploreDataMatch) {
    throw new Error('Gagal memproses formulir QRIS simulator v2')
  }

  const referenceId = refIdMatch[1]
  const exploreData = exploreDataMatch[1].replace(/&quot;/g, '"')

  const simPayRes = await fetch('https://simulator.sandbox.midtrans.com/v2/qris/payment/gopay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      referenceId,
      exploreData,
      issuer: 'gopay',
    }),
  })

  console.log(`Simulator Pembayaran Response Status: ${simPayRes.status} OK`)
  console.log(`✓ Pembayaran berhasil disimulasikan di Midtrans QRIS Simulator v2`)

  // 5. Polling Status Pembayaran & Verifikasi Perubahan Status Booking ke CONFIRMED
  console.log(`\n--- POLLING STATUS & SINKRONISASI STATUS BOOKING ---`)
  let confirmed = false
  for (let i = 1; i <= 5; i++) {
    await new Promise((r) => setTimeout(r, 2000))

    // Cek status ke Midtrans API
    const statusRes = await fetch(`https://api.sandbox.midtrans.com/v2/${orderId}/status`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Basic ${authString}`,
      },
    })
    const midtransStatus = await statusRes.json()
    console.log(`Polling ${i}: Midtrans transaction_status = '${midtransStatus.transaction_status}' (status_code: ${midtransStatus.status_code})`)

    if (midtransStatus.transaction_status === 'settlement') {
      // Jalankan applyPaymentStatus (sama dengan yang dieksekusi endpoint status / webhook)
      const mappedStatus = mapMidtransTransactionStatus(midtransStatus.transaction_status, midtransStatus.fraud_status)
      await applyPaymentStatus({
        orderId,
        targetStatus: mappedStatus,
        rawPayload: midtransStatus,
        midtransTransactionId: midtransStatus.transaction_id,
      })

      // Verifikasi di Database
      const updatedBooking = await prisma.booking.findUnique({
        where: { id: testBooking.id },
      })
      const updatedPayment = await prisma.payment.findUnique({
        where: { id: payment.id },
      })
      const updatedSeat = await prisma.scheduleSeat.findUnique({
        where: {
          scheduleId_seatNumber: {
            scheduleId: schedule.id,
            seatNumber: testSeatNumber,
          },
        },
      })

      console.log(`\nVerifikasi State Database:`)
      console.log(`- Status Booking: ${updatedBooking?.status} (Ekspektasi: CONFIRMED)`)
      console.log(`- Status Payment: ${updatedPayment?.status} (Ekspektasi: SUCCESS)`)
      console.log(`- Status Kursi ${testSeatNumber}: ${updatedSeat?.status} (Ekspektasi: BOOKED)`)

      if (updatedBooking?.status === 'CONFIRMED' && updatedPayment?.status === 'SUCCESS' && updatedSeat?.status === 'BOOKED') {
        confirmed = true
        break
      }
    }
  }

  if (!confirmed) {
    throw new Error('Status booking gagal beralih ke CONFIRMED dalam durasi polling.')
  }

  console.log(`\n🎉 HASIL: Status booking BERHASIL berubah menjadi CONFIRMED secara sempurna!`)

  // 6. Pembersihan data uji coba
  console.log(`\n--- PEMBERSIHAN DATA TES ---`)
  await prisma.$executeRaw`
    UPDATE schedule_seats
    SET status = 'AVAILABLE'::seat_status, booking_id = NULL, hold_token = NULL, hold_expires_at = NULL, updated_at = NOW()
    WHERE schedule_id = ${schedule.id} AND seat_number = ${testSeatNumber};
  `
  await prisma.paymentEvent.deleteMany({ where: { paymentId: payment.id } })
  await prisma.payment.deleteMany({ where: { id: payment.id } })
  await prisma.bookingPassenger.deleteMany({ where: { bookingId: testBooking.id } })
  await prisma.booking.deleteMany({ where: { id: testBooking.id } })

  const finalSeat = await prisma.scheduleSeat.findUnique({
    where: {
      scheduleId_seatNumber: {
        scheduleId: schedule.id,
        seatNumber: testSeatNumber,
      },
    },
  })
  console.log(`✓ Kursi ${testSeatNumber} kembali berstatus: ${finalSeat?.status}`)
  console.log(`✓ Data booking & payment tes telah dihapus dari dev database.`)

  await pool.end()
}

runRealQrisE2ETest().catch((err) => {
  console.error('❌ Terjadi galat saat pengujian E2E QRIS:', err.message)
  process.exit(1)
})
