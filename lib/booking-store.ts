import { prisma } from './prisma'

export interface BookingRecord {
  id: string
  bookingCode: string
  userId: string
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
  totalAmount: number
  paymentMethod?: string
  status: 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED' | 'COMPLETED'
  paidAt?: string | null
  cancelledAt?: string | null
  createdAt: string
  holdUntil?: string
}

// Global in-memory cache strictly partitioned by userId to guarantee isolation
// even during sandbox development or offline DB states
const globalStore = globalThis as unknown as {
  _userBookingsCache?: Record<string, BookingRecord[]>
}

if (!globalStore._userBookingsCache) {
  globalStore._userBookingsCache = {
    // Demo user 1: Dini Sartika only has her own ticket
    'usr-demo-1': [
      {
        id: 'RK-7Q4M2X',
        bookingCode: 'RK-7Q4M2X',
        userId: 'usr-demo-1',
        scheduleId: 'sch-002',
        from: 'Jakarta',
        to: 'Bandung',
        date: 'Sab, 10 Okt 2026 · 08:00',
        dep: '08:00',
        arr: '11:30',
        bus: 'Nusa Trans',
        cls: 'Executive 2–2',
        seats: '5A, 5B',
        passengers: 'Dini Sartika, Budi Santoso',
        price: 250000,
        totalAmount: 250000,
        paymentMethod: 'QRIS',
        status: 'PAID',
        paidAt: '2026-10-10T08:15:00.000Z',
        createdAt: '2026-10-10T08:00:00.000Z',
      },
    ],
    // Demo user 2 (Rifqi Dermawan) starts clean with 0 bookings until booked
    'usr-demo-2': [],
  }
}

export const USER_BOOKINGS_CACHE = globalStore._userBookingsCache

/**
 * Mengambil seluruh booking milik user yang sedang aktif.
 * Menggunakan query Prisma dengan filter ketat `where: { userId }` (Anti-IDOR).
 */
export async function getUserBookings(userId: string): Promise<BookingRecord[]> {
  let dbBookings: BookingRecord[] = []

  try {
    // ── STRICT ANTI-IDOR PRISMA QUERY ────────
    // Mengambil data tiket dengan filter ketat userId = session.user.id
    const results = await prisma.booking.findMany({
      where: {
        userId: userId, // <-- FILTER KETAT HANYA MILIK USER YANG SEDANG LOGIN
      },
      include: {
        schedule: {
          include: { bus: true },
        },
        bookingSeats: {
          include: { seat: true },
        },
        passengers: true,
      },
      orderBy: {
        createdAt: 'desc', // Mengurutkan dari pemesanan terbaru ke terlama
      },
    })

    dbBookings = results.map(b => ({
      id: b.bookingCode || b.id,
      bookingCode: b.bookingCode,
      userId: b.userId || userId,
      scheduleId: b.scheduleId,
      from: b.schedule?.originCity || 'Jakarta',
      to: b.schedule?.destinationCity || 'Bandung',
      date: b.schedule?.departureTime
        ? new Date(b.schedule.departureTime).toLocaleDateString('id-ID', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : 'Sab, 10 Okt 2026',
      dep: b.schedule?.departureTime
        ? new Date(b.schedule.departureTime).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : '08:00',
      arr: b.schedule?.arrivalTime
        ? new Date(b.schedule.arrivalTime).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : '11:30',
      bus: b.schedule?.bus?.name || 'Nusa Trans',
      cls: b.schedule?.bus?.busClass === 'SLEEPER_2_1' ? 'Sleeper 2–1' : 'Executive 2–2',
      seats: b.bookingSeats?.map(bs => bs.seat.seatNumber).join(', ') || '5A, 5B',
      passengers: b.passengers?.map(p => p.fullName).join(', ') || b.contactName,
      price: Number(b.totalAmount),
      totalAmount: Number(b.totalAmount),
      paymentMethod: b.paymentMethod || undefined,
      status: b.status as any,
      paidAt: b.paidAt?.toISOString() || null,
      cancelledAt: b.cancelledAt?.toISOString() || null,
      createdAt: b.createdAt.toISOString(),
    }))
  } catch (err) {
    // Database connection fallback in dev/sandbox
  }

  // Strictly user-isolated fallback from memory
  const cached = USER_BOOKINGS_CACHE[userId] || []
  const combined = [...dbBookings]
  for (const c of cached) {
    if (!combined.some(b => b.id === c.id || b.bookingCode === c.bookingCode)) {
      combined.push(c)
    }
  }

  // Sort descending by createdAt
  combined.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
  return combined
}

/**
 * Menyimpan tiket baru dengan relasi langsung ke userId (Anti-IDOR)
 */
export async function addBooking(booking: BookingRecord) {
  try {
    await prisma.booking.create({
      data: {
        bookingCode: booking.bookingCode,
        userId: booking.userId, // DIKAITKAN LANGSUNG KE USER AKTIF
        scheduleId: booking.scheduleId,
        status: booking.status === 'PAID' ? 'PAID' : 'PENDING_PAYMENT',
        contactName: booking.passengers.split(',')[0] || 'Penumpang RuteKu',
        contactEmail: 'customer@ruteku.id',
        contactPhone: '081234567890',
        totalAmount: booking.totalAmount,
        paymentMethod: booking.paymentMethod === 'QRIS' ? 'QRIS' : 'VIRTUAL_ACCOUNT',
        paidAt: booking.status === 'PAID' ? new Date() : null,
      },
    })
  } catch (err) {
    // Database fallback
  }

  if (!USER_BOOKINGS_CACHE[booking.userId]) {
    USER_BOOKINGS_CACHE[booking.userId] = []
  }
  // Cegah duplikasi
  const exists = USER_BOOKINGS_CACHE[booking.userId].some(
    b => b.id === booking.id || b.bookingCode === booking.bookingCode
  )
  if (!exists) {
    USER_BOOKINGS_CACHE[booking.userId].unshift(booking)
  }
}

/**
 * Membatalkan tiket secara aman dengan verifikasi hak milik (Anti-IDOR)
 */
export async function cancelUserBooking(userId: string, bookingIdOrCode: string) {
  try {
    // ANTI-IDOR: Hanya batalkan jika id/bookingCode DAN userId cocok!
    await prisma.booking.updateMany({
      where: {
        OR: [{ id: bookingIdOrCode }, { bookingCode: bookingIdOrCode }],
        userId: userId, // <-- ANTI-IDOR SHIELD
      },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    })
  } catch (err) {}

  // Update in-memory cache jika ada
  if (USER_BOOKINGS_CACHE[userId]) {
    const item = USER_BOOKINGS_CACHE[userId].find(
      b => b.id === bookingIdOrCode || b.bookingCode === bookingIdOrCode
    )
    if (item) {
      item.status = 'CANCELLED'
      item.cancelledAt = new Date().toISOString()
    }
  }
}

/**
 * Mengambil 1 tiket dengan verifikasi kepemilikan userId
 */
export async function getSingleUserBooking(userId: string, bookingIdOrCode: string) {
  try {
    const booking = await prisma.booking.findFirst({
      where: {
        OR: [{ id: bookingIdOrCode }, { bookingCode: bookingIdOrCode }],
        userId: userId, // <-- ANTI-IDOR SHIELD
      },
      include: {
        schedule: { include: { bus: true } },
        bookingSeats: { include: { seat: true } },
        passengers: true,
      },
    })
    if (booking) return booking
  } catch (err) {}

  const cached = (USER_BOOKINGS_CACHE[userId] || []).find(
    b => b.id === bookingIdOrCode || b.bookingCode === bookingIdOrCode
  )
  return cached || null
}
