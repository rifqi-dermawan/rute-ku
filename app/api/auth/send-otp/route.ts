import { NextRequest, NextResponse } from 'next/server'
import { sendOtpEmail } from '@/lib/email'
import { saveOtp } from '@/lib/otp-store'

/**
 * POST /api/auth/send-otp
 * Mengirimkan kode 6 digit OTP verifikasi ke email pengguna via Resend API
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email || !email.includes('@') || !email.includes('.')) {
      return NextResponse.json(
        { success: false, error: 'Alamat email tidak valid. Masukkan format nama@domain.com.' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Buat kode acak 6 digit
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    // Simpan ke in-memory store (berlaku 10 menit)
    saveOtp(normalizedEmail, otp, 10)

    // Kirimkan email via Resend
    const result = await sendOtpEmail({
      to: normalizedEmail,
      otp,
    })

    return NextResponse.json({
      success: true,
      message: result.success
        ? `Kode verifikasi telah dikirim ke ${normalizedEmail}. Silakan cek kotak masuk atau folder spam email Anda.`
        : `Kode verifikasi disiapkan. (Catatan server: ${result.message})`,
      email: normalizedEmail,
      devCode: otp, // Memudahkan pengujian langsung jika email mengalami delay
      simulated: result.simulated,
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Gagal memproses pengiriman kode verifikasi.' },
      { status: 500 }
    )
  }
}
