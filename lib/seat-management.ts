import { prisma } from './prisma'
import { SeatStatus } from '@prisma/client'

/**
 * Durasi standar penahanan kursi (10 menit)
 */
export const HOLD_DURATION_MINUTES = 10
export const HOLD_DURATION_MS = HOLD_DURATION_MINUTES * 60 * 1000

export interface HoldSeatInput {
  scheduleId: string
  seatNumber: string
  holdToken: string
}

export interface HoldSeatResult {
  success: boolean
  seatNumber: string
  holdToken?: string
  holdExpiresAt?: Date
  code?: 'SEAT_UNAVAILABLE' | 'SCHEDULE_NOT_FOUND' | 'ERROR'
  message?: string
  suggestions?: string[]
}

/**
 * Tahan Kursi dengan UPDATE Atomik Bersyarat dalam satu transaksi Prisma.
 *
 * Syarat kursi dapat ditahan:
 * 1. Status saat ini AVAILABLE, ATAU
 * 2. Status saat ini HOLD tetapi hold_expires_at sudah lewat (< NOW()), ATAU
 * 3. Status saat ini HOLD dengan hold_token yang sama (perpanjangan tahan kursi oleh tamu yang sama).
 *
 * Jika gagal (kursi sudah di-hold orang lain atau BOOKED/BLOCKED),
 * sistem mencari saran kursi lain yang berstatus AVAILABLE.
 */
export async function holdSeatAtomic({
  scheduleId,
  seatNumber,
  holdToken,
}: HoldSeatInput): Promise<HoldSeatResult> {
  const now = new Date()
  const holdExpiresAt = new Date(now.getTime() + HOLD_DURATION_MS)

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Eksekusi UPDATE atomik bersyarat dalam SATU perintah untuk mematuhi CHECK constraint
      const rowsAffected: number = await tx.$executeRaw`
        UPDATE schedule_seats
        SET 
          status = 'HOLD'::seat_status,
          hold_token = ${holdToken},
          hold_expires_at = ${holdExpiresAt},
          booking_id = NULL,
          updated_at = NOW()
        WHERE schedule_id = ${scheduleId}
          AND seat_number = ${seatNumber}
          AND (
            status = 'AVAILABLE'::seat_status
            OR (status = 'HOLD'::seat_status AND hold_expires_at < ${now})
            OR (status = 'HOLD'::seat_status AND hold_token = ${holdToken})
          );
      `

      if (rowsAffected > 0) {
        return {
          success: true,
          seatNumber,
          holdToken,
          holdExpiresAt,
        }
      }

      // Jika gagal (0 rows affected), cari saran kursi pengganti yang tersedia
      const availableSeats = await tx.$queryRaw<{ seat_number: string }[]>`
        SELECT seat_number
        FROM schedule_seats
        WHERE schedule_id = ${scheduleId}
          AND seat_number <> ${seatNumber}
          AND (
            status = 'AVAILABLE'::seat_status
            OR (status = 'HOLD'::seat_status AND hold_expires_at < ${now})
          )
        ORDER BY seat_number ASC
        LIMIT 6;
      `

      const suggestions = availableSeats.map((s) => s.seat_number)

      return {
        success: false,
        seatNumber,
        code: 'SEAT_UNAVAILABLE' as const,
        message: `Kursi ${seatNumber} sedang ditahan atau telah dipesan oleh pengguna lain.`,
        suggestions,
      }
    })

    return result
  } catch (error: any) {
    return {
      success: false,
      seatNumber,
      code: 'ERROR',
      message: error?.message || 'Terjadi kesalahan sistem saat menahan kursi.',
    }
  }
}

/**
 * Lepas penahanan kursi (kembali AVAILABLE) oleh pemilik token
 */
export async function releaseSeatHold({
  scheduleId,
  seatNumber,
  holdToken,
}: HoldSeatInput): Promise<boolean> {
  try {
    const rowsAffected: number = await prisma.$executeRaw`
      UPDATE schedule_seats
      SET 
        status = 'AVAILABLE'::seat_status,
        hold_token = NULL,
        hold_expires_at = NULL,
        booking_id = NULL,
        updated_at = NOW()
      WHERE schedule_id = ${scheduleId}
        AND seat_number = ${seatNumber}
        AND (hold_token = ${holdToken} OR hold_expires_at < NOW())
        AND status = 'HOLD'::seat_status;
    `
    return rowsAffected > 0
  } catch {
    return false
  }
}

/**
 * Ambil status seluruh kursi untuk jadwal tertentu dengan evaluasi masa kedaluwarsa HOLD
 */
export async function getScheduleSeatsWithAvailability(
  scheduleId: string,
  userHoldToken?: string | null
) {
  const now = new Date()

  const seats = await prisma.scheduleSeat.findMany({
    where: { scheduleId },
    orderBy: { seatNumber: 'asc' },
    select: {
      id: true,
      seatNumber: true,
      status: true,
      holdToken: true,
      holdExpiresAt: true,
    },
  })

  return seats.map((seat) => {
    let effectiveStatus: SeatStatus = seat.status

    if (seat.status === SeatStatus.HOLD) {
      if (seat.holdExpiresAt && seat.holdExpiresAt < now) {
        effectiveStatus = SeatStatus.AVAILABLE
      }
    }

    const isMine =
      Boolean(userHoldToken) &&
      seat.status === SeatStatus.HOLD &&
      seat.holdToken === userHoldToken &&
      Boolean(seat.holdExpiresAt && seat.holdExpiresAt >= now)

    return {
      seatNumber: seat.seatNumber,
      status: effectiveStatus,
      isMine,
      holdExpiresAt: seat.holdExpiresAt,
    }
  })
}

