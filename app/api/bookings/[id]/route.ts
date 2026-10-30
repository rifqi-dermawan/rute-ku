import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BookingStatus, RefundStatus, SeatStatus } from '@prisma/client'
import { calculateRefund } from '@/lib/refund-policy'

/**
 * Helper untuk mencari booking berdasarkan id, code, atau publicToken
 */
async function findBookingByIdentifier(identifier: string) {
  return await prisma.booking.findFirst({
    where: {
      OR: [
        { id: identifier },
        { code: identifier },
        { publicToken: identifier },
      ],
    },
    include: {
      schedule: {
        include: {
          bus: { include: { operator: true } },
          route: { include: { originCity: true, destinationCity: true } },
          scheduleStops: { include: { terminal: true } },
        },
      },
      seats: true,
      passengers: true,
      payments: { orderBy: { createdAt: 'desc' } },
      refund: true,
    },
  })
}

/**
 * GET /api/bookings/[id]
 * Mengambil detail booking berdasarkan publicToken, code, atau id
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const booking = await findBookingByIdentifier(id)

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking tidak ditemukan.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, booking })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal memuat booking.' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/bookings/[id]
 * Penanganan aksi pembatalan booking dan pratinjau refund
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { action, reason: customReason, requestTime } = body

    const booking = await findBookingByIdentifier(id)
    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking tidak ditemukan.' },
        { status: 404 }
      )
    }

    // ── 1. AKSI: PRATINJAU RINCIAN REFUND (PREVIEW) ───────────────────
    if (action === 'preview_cancel') {
      const isOperatorCancelled = booking.schedule.status === 'CANCELLED_BY_OPERATOR'
      const refundCalc = calculateRefund({
        departureTime: booking.schedule.departureTime,
        ticketTotal: booking.ticketTotal,
        isOperatorCancelled,
        requestTime: requestTime ? new Date(requestTime) : new Date(),
      })

      return NextResponse.json({
        success: true,
        preview: {
          bookingCode: booking.code,
          ticketTotal: booking.ticketTotal,
          serviceFeeNonRefundable: booking.serviceFee,
          grandTotal: booking.grandTotal,
          departureTime: booking.schedule.departureTime,
          hoursToDeparture: Number(refundCalc.hoursToDeparture.toFixed(1)),
          eligible: refundCalc.eligible,
          refundPercentage: refundCalc.percentage,
          refundAmount: refundCalc.refundAmount,
          policyTier: refundCalc.policyTier,
          policyText: refundCalc.policyText,
          reason: refundCalc.reason,
        },
      })
    }

    // ── 2. AKSI: BATALKAN BOOKING & PROSES REFUND ──────────────────────
    if (action === 'cancel') {
      // Tolak pembatalan ganda jika booking sudah dibatalkan
      if (booking.status === BookingStatus.CANCELLED) {
        return NextResponse.json(
          {
            success: false,
            error: 'Booking ini sudah dibatalkan sebelumnya. Pembatalan ganda ditolak.',
            code: 'ALREADY_CANCELLED',
          },
          { status: 400 }
        )
      }

      const isOperatorCancelled = booking.schedule.status === 'CANCELLED_BY_OPERATOR'
      const refundCalc = calculateRefund({
        departureTime: booking.schedule.departureTime,
        ticketTotal: booking.ticketTotal,
        isOperatorCancelled,
        requestTime: requestTime ? new Date(requestTime) : new Date(),
      })

      // Jika tidak memenuhi syarat refund (< 6 jam dan bukan operator cancel)
      if (!refundCalc.eligible) {
        return NextResponse.json(
          {
            success: false,
            error: refundCalc.reason,
            code: 'REFUND_INELIGIBLE',
            details: refundCalc,
          },
          { status: 400 }
        )
      }

      // Eksekusi atomik: Booking CANCELLED, Kursi AVAILABLE, Catat Refund
      const result = await prisma.$transaction(async (tx) => {
        const now = new Date()

        // 1. Update Booking status -> CANCELLED
        const updatedBooking = await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.CANCELLED,
            cancelledAt: now,
          },
        })

        // 2. Kembalikan seluruh kursi terkait ke status AVAILABLE
        await tx.$executeRaw`
          UPDATE schedule_seats
          SET 
            status = 'AVAILABLE'::seat_status,
            booking_id = NULL,
            hold_token = NULL,
            hold_expires_at = NULL,
            updated_at = NOW()
          WHERE booking_id = ${booking.id};
        `

        // 3. Cari payment yang sukses (jika ada) untuk ditautkan ke record refund
        const successPayment = booking.payments.find((p) => p.status === 'SUCCESS')

        // 4. Catat record refund ke tabel refunds
        const refundRecord = await tx.refund.upsert({
          where: { bookingId: booking.id },
          update: {
            amount: refundCalc.refundAmount,
            refundPercentage: refundCalc.percentage,
            reason: customReason || refundCalc.reason,
            status: RefundStatus.PENDING,
          },
          create: {
            bookingId: booking.id,
            paymentId: successPayment?.id || null,
            refundPercentage: refundCalc.percentage,
            amount: refundCalc.refundAmount,
            reason: customReason || refundCalc.reason,
            status: RefundStatus.PENDING,
          },
        })

        return { updatedBooking, refundRecord }
      })

      return NextResponse.json({
        success: true,
        message: 'Booking berhasil dibatalkan dan kursi telah dikembalikan ke sistem.',
        booking: {
          id: result.updatedBooking.id,
          code: result.updatedBooking.code,
          status: result.updatedBooking.status,
          cancelledAt: result.updatedBooking.cancelledAt,
        },
        refund: {
          percentage: result.refundRecord.refundPercentage,
          amount: result.refundRecord.amount,
          status: result.refundRecord.status,
          reason: result.refundRecord.reason,
        },
      })
    }

    return NextResponse.json(
      { success: false, error: 'Aksi tidak dikenal.' },
      { status: 400 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal memproses pembatalan.' },
      { status: 500 }
    )
  }
}
