import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/auth/register
 * Mendaftarkan akun pengguna baru dan otomatis mengaktifkan sesi login (auto-login).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { id, name, email, phone, noCookie } = body

    if (!email || !name) {
      return NextResponse.json(
        { success: false, error: 'Email dan nama lengkap wajib diisi.' },
        { status: 400 }
      )
    }

    const cleanEmail = String(email).trim().toLowerCase()
    const cleanName = String(name).trim()
    const cleanPhone = phone ? String(phone).trim() : ''
    const userId = id || `usr-${Date.now()}`

    const user = {
      id: userId,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      role: 'USER',
    }

    const response = NextResponse.json({
      success: true,
      message: 'Pendaftaran berhasil. Silakan masuk menggunakan akun Anda.',
      user,
    })

    if (!noCookie) {
      response.cookies.set('ruteku_user_id', user.id, {
        path: '/',
        maxAge: 604800,
        sameSite: 'lax',
      })
      response.cookies.set('ruteku_user_email', encodeURIComponent(user.email), {
        path: '/',
        maxAge: 604800,
        sameSite: 'lax',
      })
      response.cookies.set('ruteku_user_role', 'USER', {
        path: '/',
        maxAge: 604800,
        sameSite: 'lax',
      })
    }

    return response
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Gagal memproses pendaftaran akun.' },
      { status: 500 }
    )
  }
}

