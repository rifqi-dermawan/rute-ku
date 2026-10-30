import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BookingStatus } from '@prisma/client'

/**
 * Samarkan nama penumpang demi keamanan dan privasi publik
 * Contoh: "Budi Santoso" -> "B*** S******"
 */
function maskPassengerName(name: string): string {
  if (!name) return 'Penumpang'
  return name
    .trim()
    .split(/\s+/)
    .map((part) => {
      if (part.length <= 1) return part
      if (part.length === 2) return `${part[0]}*`
      return `${part[0]}${'*'.repeat(part.length - 1)}`
    })
    .join(' ')
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const booking = await prisma.booking.findFirst({
      where: {
        OR: [{ publicToken: id }, { id }, { code: id }],
      },
      include: {
        schedule: {
          include: {
            bus: { include: { operator: true } },
            route: { include: { originCity: true, destinationCity: true } },
            scheduleStops: { include: { terminal: true } },
          },
        },
        passengers: true,
        seats: true,
        payments: {
          where: { status: 'SUCCESS' },
          orderBy: { paidAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Data booking tidak ditemukan.' },
        { status: 404 }
      )
    }

    // ATURAN: Invoice hanya dapat diakses untuk booking CONFIRMED
    if (booking.status !== BookingStatus.CONFIRMED) {
      return NextResponse.json(
        {
          error:
            'Akses ditolak: Invoice resmi hanya tersedia untuk pemesanan yang telah dikonfirmasi dan dibayar (CONFIRMED).',
          currentStatus: booking.status,
        },
        { status: 403 }
      )
    }

    const successPayment = booking.payments[0]

    const maskedPassengers = booking.passengers.map((p) => ({
      seatNumber: p.seatNumber,
      passengerType: p.passengerType,
      fullName: maskPassengerName(p.fullName),
    }))

    const originStop = booking.schedule.scheduleStops.find(
      (s) => s.stopSequence === 1
    )
    const destinationStop = booking.schedule.scheduleStops.find(
      (s) => s.stopSequence === 2
    )

    return NextResponse.json({
      success: true,
      invoice: {
        invoiceNumber: `INV-${booking.code}`,
        bookingCode: booking.code,
        publicToken: booking.publicToken,
        status: booking.status,
        issuedAt: successPayment?.paidAt || booking.updatedAt,
        route: {
          originCity: booking.schedule.route.originCity.name,
          destinationCity: booking.schedule.route.destinationCity.name,
          originTerminal:
            originStop?.terminal.name || booking.schedule.route.originCity.name,
          destinationTerminal:
            destinationStop?.terminal.name ||
            booking.schedule.route.destinationCity.name,
          departureTime: booking.schedule.departureTime,
          arrivalTime: booking.schedule.arrivalTime,
        },
        bus: {
          operatorName: booking.schedule.bus.operator.name,
          busName: booking.schedule.bus.name,
          busClass: booking.schedule.bus.busClass,
        },
        contact: {
          name: maskPassengerName(booking.contactName),
          email: booking.contactEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
          phone: booking.contactPhone.replace(/(\d{3})\d+(\d{3})/, '$1****$2'),
        },
        passengers: maskedPassengers,
        seats: booking.seats.map((s) => s.seatNumber),
        payment: {
          paymentMethod: successPayment?.paymentMethod || 'QRIS',
          orderId: successPayment?.orderId,
          midtransTransactionId: successPayment?.midtransTransactionId,
          paidAt: successPayment?.paidAt,
          ticketTotal: booking.ticketTotal,
          serviceFee: booking.serviceFee,
          grandTotal: booking.grandTotal,
        },
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Gagal memuat invoice' },
      { status: 500 }
    )
  }
}

