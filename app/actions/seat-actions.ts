'use server'

import { cookies } from 'next/headers'
import crypto from 'crypto'
import {
  holdSeatAtomic,
  releaseSeatHold,
  getScheduleSeatsWithAvailability,
} from '@/lib/seat-management'

/**
 * Mengambil atau menerbitkan hold_token tamu dalam cookie httpOnly
 */
export async function getOrCreateHoldToken(): Promise<string> {
  const cookieStore = await cookies()
  let token = cookieStore.get('ruteku_hold_token')?.value

  if (!token) {
    token = crypto.randomUUID()
    cookieStore.set('ruteku_hold_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 jam
    })
  }

  return token
}

/**
 * Server Action: Menahan kursi bus secara atomik bersyarat
 */
export async function holdSeatAction({
  scheduleId,
  seatNumber,
  holdToken: customHoldToken,
}: {
  scheduleId: string
  seatNumber: string
  holdToken?: string
}) {
  const holdToken = customHoldToken || (await getOrCreateHoldToken())
  return await holdSeatAtomic({ scheduleId, seatNumber, holdToken })
}

/**
 * Server Action: Melepas penahanan kursi
 */
export async function releaseSeatAction({
  scheduleId,
  seatNumber,
  holdToken: customHoldToken,
}: {
  scheduleId: string
  seatNumber: string
  holdToken?: string
}) {
  const holdToken = customHoldToken || (await getOrCreateHoldToken())
  const success = await releaseSeatHold({ scheduleId, seatNumber, holdToken })
  return { success }
}

/**
 * Server Action: Ambil data ketersediaan kursi jadwal
 */
export async function fetchScheduleSeatsAction(scheduleId: string) {
  const holdToken = await getOrCreateHoldToken()
  const seats = await getScheduleSeatsWithAvailability(scheduleId, holdToken)
  return { seats, holdToken }
}
