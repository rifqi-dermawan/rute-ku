import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { BookingStatus, SeatStatus } from '@prisma/client'
import { HOLD_DURATION_MS } from '@/lib/seat-management'

/**
 * Resolusi hold_token tamu dari cookie httpOnly atau header
 */
async function resolveHoldToken(req: NextRequest): Promise<string> {
  const cookieStore = await cookies()
  const cookieToken = cookieStore.get('ruteku_hold_token')?.value
  const headerToken = req.headers.get('x-hold-token')
  return cookieToken || headerToken || crypto.randomUUID()
}

/**
 * GET /api/bookings
 * Mengambil daftar booking untuk tamu (berdasarkan publicToken, holdToken, atau email).
 * Tanpa login paksa / tanpa dependensi tabel users.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const publicToken = searchParams.get('publicToken')
    const email = searchParams.get('email')
    const cookieStore = await cookies()
    const holdToken = searchParams.get('holdToken') || cookieStore.get('ruteku_hold_token')?.value

    if (publicToken) {
      const booking = await prisma.booking.findUnique({
        where: { publicToken },
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
          payments: { orderBy: { createdAt: 'desc' } },
          refund: true,
        },
      })

      if (!booking) {
        return NextResponse.json(
          { success: false, error: 'Booking tidak ditemukan.' },
          { status: 404 }
        )
      }

      return NextResponse.json({ success: true, booking })
    }

    // Filter berdasarkan email atau holdToken
    const whereClause: any = {}
    if (email) {
      whereClause.contactEmail = email
    } else if (holdToken) {
      // Ambil booking yang kursi-kursinya memiliki hold_token terkait
      whereClause.seats = {
        some: {
          holdToken,
        },
      }
    } else {
      return NextResponse.json({ success: true, bookings: [] })
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        schedule: {
          include: {
            bus: { include: { operator: true } },
            route: { include: { originCity: true, destinationCity: true } },
          },
        },
        passengers: true,
        seats: true,
        payments: { orderBy: { createdAt: 'desc' } },
        refund: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return NextResponse.json({
      success: true,
      count: bookings.length,
      bookings,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal memuat booking.' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/bookings
 * Membuat booking baru untuk tamu (guest) secara atomik.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      scheduleId,
      seats,
      passengers,
      contactName,
      contactEmail,
      contactPhone,
    } = body

    if (!scheduleId || !seats || !Array.isArray(seats) || seats.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Data jadwal dan kursi wajib diisi.' },
        { status: 400 }
      )
    }

    if (!contactName || !contactEmail || !contactPhone) {
      return NextResponse.json(
        { success: false, error: 'Kontak pemesan (nama, email, no HP) wajib diisi.' },
        { status: 400 }
      )
    }

    const holdToken = body.holdToken || (await resolveHoldToken(req))
    const now = new Date()
    const holdExpiresAt = new Date(now.getTime() + HOLD_DURATION_MS)

    // Dapatkan data jadwal dari database (JANGAN percaya harga dari client!)
    const schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: { bus: true },
    })

    if (!schedule) {
      return NextResponse.json(
        { success: false, error: 'Jadwal bus tidak ditemukan.' },
        { status: 404 }
      )
    }

    // Hitung total harga sesuai schema baru (CHECK constraint: grand_total = ticket_total + service_fee)
    const ticketTotal = schedule.price * seats.length
    const serviceFee = 0 // Biaya layanan (non-refundable)
    const grandTotal = ticketTotal + serviceFee

    // Eksekusi atomik dalam transaksi Prisma
    const newBooking = await prisma.$transaction(async (tx) => {
      // 1. Validasi & update kursi: Pastikan kursi bisa di-hold/sudah di-hold oleh tamu ini
      for (const seatNumber of seats) {
        const rowsAffected: number = await tx.$executeRaw`
          UPDATE schedule_seats
          SET 
            status = 'HOLD'::seat_status,
            hold_token = ${holdToken},
            hold_expires_at = ${holdExpiresAt},
            updated_at = NOW()
          WHERE schedule_id = ${scheduleId}
            AND seat_number = ${seatNumber}
            AND (
              status = 'AVAILABLE'::seat_status
              OR (status = 'HOLD'::seat_status AND hold_expires_at < ${now})
              OR (status = 'HOLD'::seat_status AND hold_token = ${holdToken})
            );
        `

        if (rowsAffected === 0) {
          throw new Error(`SEAT_UNAVAILABLE:${seatNumber}`)
        }
      }

      // 2. Generate kode booking acak (contoh: RK-7Q4M2X)
      const code = `RK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

      // 3. Buat entitas Booking tamu (tanpa userId)
      const booking = await tx.booking.create({
        data: {
          code,
          scheduleId,
          status: BookingStatus.PENDING_PAYMENT,
          contactName: contactName.trim(),
          contactEmail: contactEmail.trim().toLowerCase(),
          contactPhone: contactPhone.trim(),
          ticketTotal,
          serviceFee,
          grandTotal,
        },
      })

      // 4. Kaitkan kursi dengan bookingId
      await tx.$executeRaw`
        UPDATE schedule_seats
        SET 
          booking_id = ${booking.id},
          updated_at = NOW()
        WHERE schedule_id = ${scheduleId}
          AND seat_number = ANY(${seats}::text[]);
      `

      // 5. Tambahkan penumpang ke tabel booking_passengers
      if (Array.isArray(passengers) && passengers.length > 0) {
        for (const p of passengers) {
          await tx.bookingPassenger.create({
            data: {
              bookingId: booking.id,
              seatNumber: p.seatNumber || p.seat || seats[0],
              fullName: p.fullName || p.name || contactName,
              passengerType: p.passengerType || p.type || 'adult',
            },
          })
        }
      } else {
        // Fallback: 1 penumpang per kursi menggunakan nama kontak
        for (const seatNumber of seats) {
          await tx.bookingPassenger.create({
            data: {
              bookingId: booking.id,
              seatNumber,
              fullName: contactName,
              passengerType: 'adult',
            },
          })
        }
      }

      return booking
    })

    return NextResponse.json({
      success: true,
      message: 'Booking berhasil dibuat. Silakan lanjutkan ke pembayaran.',
      booking: {
        id: newBooking.id,
        code: newBooking.code,
        publicToken: newBooking.publicToken,
        ticketTotal: newBooking.ticketTotal,
        serviceFee: newBooking.serviceFee,
        grandTotal: newBooking.grandTotal,
        status: newBooking.status,
      },
    })
  } catch (error: any) {
    if (error.message?.startsWith('SEAT_UNAVAILABLE:')) {
      const takenSeat = error.message.split(':')[1]
      return NextResponse.json(
        {
          success: false,
          error: `Kursi ${takenSeat} baru saja diambil oleh penumpang lain. Silakan pilih kursi lain.`,
          code: 'SEAT_UNAVAILABLE',
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal membuat booking.' },
      { status: 500 }
    )
  }
}
