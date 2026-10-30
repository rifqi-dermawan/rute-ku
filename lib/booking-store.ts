import { prisma } from './prisma'
import { BookingStatus, SeatStatus } from '@prisma/client'

export interface BookingRecord {
  id: string
  bookingCode: string
  publicToken?: string
  userId?: string
  scheduleId: string
  from: string
  to: string
  date: string
  dep: string
  arr: string
  bus: string
  cls: string
  seats: string
  passengers: string
  price: number
  ticketTotal?: number
  serviceFee?: number
  grandTotal?: number
  totalAmount: number
  paymentMethod?: string
  status: BookingStatus | 'PAID' | 'PENDING_PAYMENT' | 'CANCELLED' | 'CONFIRMED' | 'EXPIRED'
  paidAt?: string | null
  cancelledAt?: string | null
  createdAt: string
  holdUntil?: string
}

/**
 * Mengambil booking berdasarkan holdToken tamu atau email
 */
export async function getUserBookings(identifier: string): Promise<BookingRecord[]> {
  try {
    const results = await prisma.booking.findMany({
      where: {
        OR: [
          { contactEmail: identifier },
          { id: identifier },
          { code: identifier },
          { seats: { some: { holdToken: identifier } } },
        ],
      },
      include: {
        schedule: {
          include: {
            bus: true,
            route: { include: { originCity: true, destinationCity: true } },
          },
        },
        seats: true,
        passengers: true,
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    })

    return results.map((b) => {
      const depDate = b.schedule?.departureTime ? new Date(b.schedule.departureTime) : null
      const arrDate = b.schedule?.arrivalTime ? new Date(b.schedule.arrivalTime) : null
      const latestPayment = b.payments[0]

      return {
        id: b.id,
        bookingCode: b.code,
        publicToken: b.publicToken,
        scheduleId: b.scheduleId,
        from: b.schedule?.route?.originCity?.name || 'Jakarta',
        to: b.schedule?.route?.destinationCity?.name || 'Bandung',
        date: depDate
          ? depDate.toLocaleDateString('id-ID', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
          : 'Sab, 10 Okt 2026',
        dep: depDate
          ? depDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          : '08:00',
        arr: arrDate
          ? arrDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          : '11:30',
        bus: b.schedule?.bus?.name || 'Nusa Trans',
        cls: b.schedule?.bus?.busClass === 'SLEEPER_2_1' ? 'Sleeper 2–1' : 'Executive 2–2',
        seats: b.seats.map((s) => s.seatNumber).join(', ') || '-',
        passengers: b.passengers.map((p) => p.fullName).join(', ') || b.contactName,
        price: b.grandTotal,
        ticketTotal: b.ticketTotal,
        serviceFee: b.serviceFee,
        grandTotal: b.grandTotal,
        totalAmount: b.grandTotal,
        paymentMethod: latestPayment?.paymentMethod || 'QRIS',
        status: b.status,
        paidAt: latestPayment?.paidAt?.toISOString() || null,
        cancelledAt: b.cancelledAt?.toISOString() || null,
        createdAt: b.createdAt.toISOString(),
      }
    })
  } catch (err) {
    return []
  }
}

/**
 * Mengambil 1 tiket dengan identifier (id, code, atau publicToken)
 */
export async function getSingleUserBooking(identifier: string) {
  try {
    return await prisma.booking.findFirst({
      where: {
        OR: [{ id: identifier }, { code: identifier }, { publicToken: identifier }],
      },
      include: {
        schedule: {
          include: {
            bus: true,
            route: { include: { originCity: true, destinationCity: true } },
          },
        },
        seats: true,
        passengers: true,
        payments: { orderBy: { createdAt: 'desc' } },
        refund: true,
      },
    })
  } catch {
    return null
  }
}
