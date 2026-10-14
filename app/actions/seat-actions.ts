/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { prisma } from '@/lib/prisma'

export async function holdSeat({
  scheduleId,
  seatId,
  sessionId,
}: {
  scheduleId: string
  seatId: string
  sessionId: string
}) {
  const now = new Date()
  const holdDurationMs = 10 * 60 * 1000 // 10 menit

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Bersihkan hold yang sudah expired di kursi tersebut jika ada
      await tx.seatHold.deleteMany({
        where: {
          seatId,
          expiresAt: { lt: now },
        },
      })

      // 2. Cek apakah kursi sudah dibeli permanen
      const isBooked = await tx.bookingSeat.findFirst({
        where: {
          seatId,
          booking: { status: 'PAID' },
        },
      })
      if (isBooked) throw new Error('SEAT_BOOKED')

      // 3. Cek apakah sedang ditahan oleh sesi lain
      const existingHold = await tx.seatHold.findUnique({
        where: { scheduleId_seatId: { scheduleId, seatId } },
      })

      if (existingHold && existingHold.sessionId !== sessionId) {
        throw new Error('SEAT_TAKEN') // Kursi direbut orang lain
      }

      // 4. Upsert SeatHold
      const expiresAt = new Date(now.getTime() + holdDurationMs)
      return await tx.seatHold.upsert({
        where: { scheduleId_seatId: { scheduleId, seatId } },
        update: { expiresAt },
        create: {
          scheduleId,
          seatId,
          sessionId,
          expiresAt,
        },
      })
    })

    return { success: true, data: result }
  } catch (error: any) {
    if (error.message === 'SEAT_TAKEN') {
      return { success: false, code: 'SEAT_TAKEN' }
    }
    return { success: false, code: 'ERROR', message: error.message }
  }
}
