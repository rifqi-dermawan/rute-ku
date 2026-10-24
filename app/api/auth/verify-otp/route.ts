import { NextRequest, NextResponse } from 'next/server'
import { verifyOtp } from '@/lib/otp-store'

/**
 * POST /api/auth/verify-otp
 * Memvalidasi kode 6 digit OTP dan membuat sesi login pengguna
 */
export async function POST(req: NextRequest) {
  try {
    const { email, otp, name } = await req.json()

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, error: 'Email dan kode OTP wajib diisi.' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.trim().toLowerCase()
    const result = verifyOtp(normalizedEmail, otp)

    if (!result.valid) {
      return NextResponse.json(
        { success: false, error: result.reason || 'Kode verifikasi tidak valid.' },
        { status: 400 }
      )
    }

    // Buat profil pengguna
    const rawName = name?.trim() || normalizedEmail.split('@')[0]
    const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1)
    const userId = `usr-otp-${Date.now()}`

    const user = {
      id: userId,
      name: formattedName,
      email: normalizedEmail,
      phone: '0812' + Math.floor(10000000 + Math.random() * 90000000),
      role: 'USER',
    }

    const response = NextResponse.json({
      success: true,
      message: 'Verifikasi berhasil. Anda telah masuk.',
      user,
    })

    // Set cookie sesi
    response.cookies.set('ruteku_user_id', user.id, {
      path: '/',
      maxAge: 604800, // 7 hari
      sameSite: 'lax',
    })
    response.cookies.set('ruteku_user_role', 'USER', {
      path: '/',
      maxAge: 604800,
      sameSite: 'lax',
    })

    return response
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Gagal memverifikasi kode OTP.' },
      { status: 500 }
    )
  }
}
