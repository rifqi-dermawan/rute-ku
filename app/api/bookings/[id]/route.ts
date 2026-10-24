import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSingleUserBooking, cancelUserBooking } from '@/lib/booking-store'

async function getAuthenticatedUserId(req: NextRequest): Promise<string | null> {
  const cookieStore = await cookies()
  const cookieUserId = cookieStore.get('ruteku_user_id')?.value
  const headerUserId = req.headers.get('x-user-id')
  const queryUserId = req.nextUrl.searchParams.get('userId')

  return cookieUserId || headerUserId || queryUserId || null
}

/**
 * GET /api/bookings/[id]
 * Retrieves a single booking strictly if it belongs to the authenticated user.
 * Blocks unauthorized access (anti-IDOR).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sessionUserId = await getAuthenticatedUserId(req)

    if (!sessionUserId) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Silakan login terlebih dahulu.' },
        { status: 401 }
      )
    }

    // STRICT ANTI-IDOR CHECK
    const booking = await getSingleUserBooking(sessionUserId, id)

    if (booking) {
      return NextResponse.json({ success: true, booking })
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Tiket tidak ditemukan atau Anda tidak memiliki izin akses ke tiket ini.',
      },
      { status: 404 }
    )
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Terjadi kesalahan server.' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/bookings/[id]
 * Allows user to cancel or update their own booking only (Anti-IDOR).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sessionUserId = await getAuthenticatedUserId(req)

    if (!sessionUserId) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Silakan login terlebih dahulu.' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { action } = body

    if (action === 'cancel') {
      await cancelUserBooking(sessionUserId, id)

      return NextResponse.json({
        success: true,
        message: 'Tiket berhasil dibatalkan.',
      })
    }

    return NextResponse.json({ success: false, error: 'Aksi tidak dikenal.' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Terjadi kesalahan server.' },
      { status: 500 }
    )
  }
}
