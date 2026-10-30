import crypto from 'crypto'
import { prisma } from './prisma'
import { BookingStatus, PaymentStatus, SeatStatus } from '@prisma/client'

export interface ApplyPaymentStatusParams {
  orderId?: string
  paymentId?: string
  targetStatus: PaymentStatus
  rawPayload?: any
  midtransTransactionId?: string
}

export interface ApplyPaymentStatusResult {
  success: boolean
  paymentId: string
  orderId: string
  previousStatus: PaymentStatus
  currentStatus: PaymentStatus
  bookingStatus: BookingStatus
  isAlreadyProcessed: boolean
}

/**
 * Pemetaan status transaksi Midtrans ke Prisma PaymentStatus
 */
export function mapMidtransTransactionStatus(
  trxStatus: string,
  fraudStatus?: string
): PaymentStatus {
  const s = (trxStatus || '').toLowerCase()

  if (s === 'capture') {
    if (fraudStatus === 'challenge') {
      return PaymentStatus.PENDING
    }
    return PaymentStatus.SUCCESS
  }

  if (s === 'settlement') {
    return PaymentStatus.SUCCESS
  }

  if (s === 'expire') {
    return PaymentStatus.EXPIRED
  }

  if (s === 'cancel' || s === 'deny' || s === 'failure') {
    return PaymentStatus.FAILED
  }

  return PaymentStatus.PENDING
}

/**
 * Verifikasi signature key SHA-512 resmi Midtrans:
 * SHA512(order_id + status_code + gross_amount + server_key)
 */
export function verifyMidtransSignature({
  orderId,
  statusCode,
  grossAmount,
  serverKey,
  signatureKey,
}: {
  orderId: string
  statusCode: string
  grossAmount: string | number
  serverKey: string
  signatureKey: string
}): boolean {
  if (!signatureKey || !serverKey) return false

  const rawStr1 = `${orderId}${statusCode}${grossAmount}${serverKey}`
  const hash1 = crypto.createHash('sha512').update(rawStr1).digest('hex')

  const rounded = Math.round(Number(grossAmount))
  const rawStr2 = `${orderId}${statusCode}${rounded}.00${serverKey}`
  const hash2 = crypto.createHash('sha512').update(rawStr2).digest('hex')

  const rawStr3 = `${orderId}${statusCode}${rounded}${serverKey}`
  const hash3 = crypto.createHash('sha512').update(rawStr3).digest('hex')

  return (
    hash1 === signatureKey ||
    hash2 === signatureKey ||
    hash3 === signatureKey
  )
}

/**
 * SATU-SATUNYA PINTU PERUBAHAN STATUS PAYMENT DAN BOOKING (applyPaymentStatus)
 *
 * Sifat:
 * 1. Idempoten: Pemanggilan ganda dengan status yang sama tidak mengeksekusi ulang efek samping.
 * 2. Transaksi dengan Baris Payment Terkunci (SELECT ... FOR UPDATE).
 * 3. Selalu mencatat riwayat perubahan status ke tabel `payment_events`.
 * 4. Mengubah status booking dan kursi secara sinkron dalam satu transaksi atomik.
 */
export async function applyPaymentStatus({
  orderId,
  paymentId,
  targetStatus,
  rawPayload = {},
  midtransTransactionId,
}: ApplyPaymentStatusParams): Promise<ApplyPaymentStatusResult> {
  return await prisma.$transaction(async (tx) => {
    // 1. Kunci baris payment untuk mencegah race condition (misal webhook & polling tiba bersamaan)
    const lockedRows = await tx.$queryRaw<
      {
        id: string
        booking_id: string
        order_id: string
        amount: number
        status: PaymentStatus
        midtrans_transaction_id: string | null
      }[]
    >`
      SELECT id, booking_id, order_id, amount, status, midtrans_transaction_id
      FROM payments
      WHERE (${paymentId}::text IS NOT NULL AND id = ${paymentId}::text)
         OR (${orderId}::text IS NOT NULL AND order_id = ${orderId}::text)
      LIMIT 1
      FOR UPDATE;
    `

    if (!lockedRows || lockedRows.length === 0) {
      throw new Error(
        `Payment record tidak ditemukan untuk orderId: ${orderId} / paymentId: ${paymentId}`
      )
    }

    const payment = lockedRows[0]
    const previousStatus = payment.status

    // 2. Cek Idempotensi: Jika status saat ini sudah sama dengan targetStatus
    if (previousStatus === targetStatus) {
      // Ambil status booking saat ini
      const b = await tx.booking.findUnique({
        where: { id: payment.booking_id },
        select: { status: true },
      })

      return {
        success: true,
        paymentId: payment.id,
        orderId: payment.order_id,
        previousStatus,
        currentStatus: previousStatus,
        bookingStatus: b?.status || BookingStatus.PENDING_PAYMENT,
        isAlreadyProcessed: true,
      }
    }

    // Perlindungan: Jangan ubah payment yang sudah SUCCESS menjadi FAILED atau EXPIRED karena notifikasi terlambat
    if (previousStatus === PaymentStatus.SUCCESS && targetStatus !== PaymentStatus.SUCCESS) {
      const b = await tx.booking.findUnique({
        where: { id: payment.booking_id },
        select: { status: true },
      })

      return {
        success: true,
        paymentId: payment.id,
        orderId: payment.order_id,
        previousStatus,
        currentStatus: previousStatus,
        bookingStatus: b?.status || BookingStatus.CONFIRMED,
        isAlreadyProcessed: true,
      }
    }

    // 3. Catat ke tabel payment_events
    await tx.paymentEvent.create({
      data: {
        paymentId: payment.id,
        eventType: targetStatus,
        payload: rawPayload || {},
      },
    })

    // 4. Update data baris payment
    const now = new Date()
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: targetStatus,
        paidAt: targetStatus === PaymentStatus.SUCCESS ? now : undefined,
        midtransTransactionId:
          midtransTransactionId || payment.midtrans_transaction_id,
      },
    })

    let finalBookingStatus: BookingStatus = BookingStatus.PENDING_PAYMENT

    // 5. Perubahan Berantai ke Booking dan Schedule Seats
    if (targetStatus === PaymentStatus.SUCCESS) {
      finalBookingStatus = BookingStatus.CONFIRMED

      // Booking status -> CONFIRMED
      await tx.booking.update({
        where: { id: payment.booking_id },
        data: { status: BookingStatus.CONFIRMED },
      })

      // Kursi -> BOOKED (Memenuhi CHECK constraint status <> 'BOOKED' OR booking_id IS NOT NULL)
      await tx.$executeRaw`
        UPDATE schedule_seats
        SET 
          status = 'BOOKED'::seat_status,
          booking_id = ${payment.booking_id},
          hold_token = NULL,
          hold_expires_at = NULL,
          updated_at = NOW()
        WHERE booking_id = ${payment.booking_id};
      `
    } else if (
      targetStatus === PaymentStatus.EXPIRED ||
      targetStatus === PaymentStatus.FAILED
    ) {
      // Cek apakah ada payment lain yang masih PENDING atau SUCCESS untuk booking ini
      const activePayments = await tx.payment.findMany({
        where: {
          bookingId: payment.booking_id,
          id: { not: payment.id },
          status: { in: [PaymentStatus.PENDING, PaymentStatus.SUCCESS] },
        },
      })

      if (activePayments.length === 0) {
        finalBookingStatus =
          targetStatus === PaymentStatus.EXPIRED
            ? BookingStatus.EXPIRED
            : BookingStatus.CANCELLED

        await tx.booking.update({
          where: { id: payment.booking_id },
          data: { status: finalBookingStatus },
        })

        // Lepas kembali seluruh kursi yang ditautkan ke booking ini menjadi AVAILABLE
        await tx.$executeRaw`
          UPDATE schedule_seats
          SET 
            status = 'AVAILABLE'::seat_status,
            booking_id = NULL,
            hold_token = NULL,
            hold_expires_at = NULL,
            updated_at = NOW()
          WHERE booking_id = ${payment.booking_id};
        `
      }
    }

    return {
      success: true,
      paymentId: payment.id,
      orderId: payment.order_id,
      previousStatus,
      currentStatus: targetStatus,
      bookingStatus: finalBookingStatus,
      isAlreadyProcessed: false,
    }
  })
}

