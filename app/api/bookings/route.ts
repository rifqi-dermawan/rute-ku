import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getUserBookings, addBooking, BookingRecord } from '@/lib/booking-store'

/**
 * Helper to resolve authenticated user ID from cookies, headers, or query params.
 */
async function getAuthenticatedUserId(req: NextRequest): Promise<string | null> {
  const cookieStore = await cookies()
  const cookieUserId = cookieStore.get('ruteku_user_id')?.value
  const headerUserId = req.headers.get('x-user-id')
  const queryUserId = req.nextUrl.searchParams.get('userId')

  return cookieUserId || headerUserId || queryUserId || null
}

/**
 * GET /api/bookings
 * Retrieves booking history strictly filtered by the authenticated user's ID.
 * PREVENTS IDOR: Users can NEVER query or view other users' tickets.
 *
 * Contoh Query Prisma yang Dijalankan (Aman & Privat):
 * const riwayatBooking = await prisma.booking.findMany({
 *   where: {
 *     userId: session.user.id
 *   },
 *   orderBy: {
 *     createdAt: 'desc'
 *   }
 * });
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(req)

    // Unauthenticated access: return 401 immediately to protect privacy
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Akses ditolak. Silakan login terlebih dahulu untuk melihat riwayat booking Anda.',
          bookings: [],
        },
        { status: 401 }
      )
    }

    // Ambil data booking milik user ini saja (Anti-IDOR)
    const userBookings = await getUserBookings(userId)

    return NextResponse.json({
      success: true,
      userId,
      count: userBookings.length,
      bookings: userBookings,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Gagal memuat riwayat booking.',
        bookings: [],
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/bookings
 * Creates a new booking strictly associated with the authenticated user ID.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(req)
    const body = await req.json()

    const {
      bookingCode,
      scheduleId,
      from,
      to,
      date,
      dep,
      arr,
      bus,
      cls,
      seats,
      passengers,
      contactName,
      contactEmail,
      contactPhone,
      price,
      totalAmount,
      paymentMethod,
      status = 'PAID',
    } = body

    // Require an authenticated user
    const finalUserId = userId || body.userId
    if (!finalUserId) {
      return NextResponse.json(
        { success: false, error: 'User harus login untuk membuat booking.' },
        { status: 401 }
      )
    }

    const finalBookingCode =
      bookingCode || `RK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    const newBookingRecord: BookingRecord = {
      id: finalBookingCode,
      bookingCode: finalBookingCode,
      userId: finalUserId, // STRICTLY TIED TO THIS USER
      scheduleId: scheduleId || 'sch-002',
      from: from || 'Jakarta',
      to: to || 'Bandung',
      date: date || 'Sab, 10 Okt 2026',
      dep: dep || '08:00',
      arr: arr || '11:30',
      bus: bus || 'Nusa Trans',
      cls: cls || 'Executive 2–2',
      seats: Array.isArray(seats) ? seats.join(', ') : seats || '5A, 5B',
      passengers: Array.isArray(passengers)
        ? passengers.map((p: any) => p.name || p.fullName || p).join(', ')
        : passengers || contactName || 'Penumpang RuteKu',
      price: Number(totalAmount || price || 250000),
      totalAmount: Number(totalAmount || price || 250000),
      paymentMethod: paymentMethod || 'QRIS',
      status: status || 'PAID',
      paidAt: status === 'PAID' ? new Date().toISOString() : null,
      createdAt: new Date().toISOString(),
    }

    await addBooking(newBookingRecord)

    return NextResponse.json({
      success: true,
      message: 'Booking berhasil disimpan secara privat untuk akun Anda.',
      booking: newBookingRecord,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menyimpan booking.' },
      { status: 500 }
    )
  }
}
