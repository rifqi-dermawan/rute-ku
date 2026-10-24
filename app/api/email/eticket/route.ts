import { NextRequest, NextResponse } from 'next/server'
import { sendEticketEmail } from '@/lib/email'

/**
 * POST /api/email/eticket
 * Mengirimkan e-tiket resmi via Resend API ke alamat email pemesan
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      to,
      bookingCode,
      passengerNames,
      seats,
      from,
      toCity,
      date,
      dep,
      arr,
      bus,
      cls,
      totalAmount,
    } = body

    if (!to) {
      return NextResponse.json(
        { success: false, error: 'Alamat email penerima wajib diisi.' },
        { status: 400 }
      )
    }

    const result = await sendEticketEmail({
      to,
      bookingCode: bookingCode || 'RK-RUTEKU',
      passengerNames: passengerNames || 'Penumpang RuteKu',
      seats: seats || '-',
      from: from || 'Jakarta',
      toCity: toCity || 'Bandung',
      date: date || 'Sab, 10 Okt 2026',
      dep: dep || '08:00',
      arr: arr || '11:30',
      bus: bus || 'Nusa Trans',
      cls: cls || 'Executive 2–2',
      totalAmount: Number(totalAmount || 100000),
    })

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memproses pengiriman email.' },
      { status: 500 }
    )
  }
}
