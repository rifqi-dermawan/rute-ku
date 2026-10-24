import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/auth/google
 * Endpoint untuk autentikasi Google OAuth
 */
export async function POST(req: NextRequest) {
  try {
    const { email, name, avatar } = await req.json()

    const userEmail = email?.trim()?.toLowerCase() || 'user.google@gmail.com'
    const userName = name?.trim() || userEmail.split('@')[0]
    const formattedName = userName.charAt(0).toUpperCase() + userName.slice(1)
    const userId = `usr-g-${Date.now()}`

    const user = {
      id: userId,
      name: formattedName,
      email: userEmail,
      phone: '0813' + Math.floor(10000000 + Math.random() * 90000000),
      avatar: avatar || 'https://lh3.googleusercontent.com/a/default-user',
      role: 'USER',
    }

    const response = NextResponse.json({
      success: true,
      message: 'Berhasil masuk dengan Akun Google.',
      user,
    })

    // Set cookie sesi
    response.cookies.set('ruteku_user_id', user.id, {
      path: '/',
      maxAge: 604800,
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
      { success: false, error: err.message || 'Gagal memproses autentikasi Google.' },
      { status: 500 }
    )
  }
}
