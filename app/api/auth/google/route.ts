import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/auth/google
 * Endpoint untuk verifikasi autentikasi Google OAuth
 * Menerima credential (ID Token Google) atau accessToken dari Google Identity Services,
 * atau data profil yang telah terotentikasi.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { credential, accessToken, email, name, avatar } = body

    let verifiedEmail = ''
    let verifiedName = ''
    let verifiedAvatar = ''

    // 1. Verifikasi dengan Google ID Token (Google Identity Services GIS)
    if (credential) {
      try {
        const gRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`)
        if (!gRes.ok) {
          return NextResponse.json({ success: false, error: 'Token Google tidak valid atau kedaluwarsa.' }, { status: 401 })
        }
        const gData = await gRes.json()
        verifiedEmail = gData.email
        verifiedName = gData.name || gData.given_name || verifiedEmail.split('@')[0]
        verifiedAvatar = gData.picture || ''
      } catch (err: any) {
        return NextResponse.json({ success: false, error: 'Gagal memverifikasi token ke server Google: ' + err.message }, { status: 500 })
      }
    }
    // 2. Verifikasi dengan Google Access Token
    else if (accessToken) {
      try {
        const gRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (!gRes.ok) {
          return NextResponse.json({ success: false, error: 'Access token Google tidak valid.' }, { status: 401 })
        }
        const gData = await gRes.json()
        verifiedEmail = gData.email
        verifiedName = gData.name || verifiedEmail.split('@')[0]
        verifiedAvatar = gData.picture || ''
      } catch (err: any) {
        return NextResponse.json({ success: false, error: 'Gagal memuat profil pengguna dari Google: ' + err.message }, { status: 500 })
      }
    }
    // 3. Fallback jika ada email spesifik yang dikirim
    else if (email && String(email).trim()) {
      verifiedEmail = String(email).trim().toLowerCase()
      verifiedName = name ? String(name).trim() : verifiedEmail.split('@')[0]
      verifiedAvatar = avatar || ''
    } 
    // 4. Jika tidak ada token dan belum ada konfigurasi Google OAuth
    else {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET

      if (!clientId || clientId.includes('MASUKKAN') || clientId.includes('ISI_') || !clientSecret) {
        return NextResponse.json({
          success: false,
          needsSetup: true,
          error: 'Google OAuth belum dikonfigurasi di file .env. Masukkan NEXT_PUBLIC_GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET untuk mengaktifkan login Google resmi, atau gunakan form Masuk/Daftar.',
        }, { status: 400 })
      }

      return NextResponse.json({
        success: false,
        error: 'Data autentikasi Google tidak ditemukan. Silakan coba kembali.',
      }, { status: 400 })
    }

    const formattedName = verifiedName.charAt(0).toUpperCase() + verifiedName.slice(1)
    const userId = `usr-g-${Date.now()}`

    const user = {
      id: userId,
      name: formattedName,
      email: verifiedEmail,
      phone: '0812' + Math.floor(10000000 + Math.random() * 90000000),
      avatar: verifiedAvatar || 'https://lh3.googleusercontent.com/a/default-user',
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

    return response
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Gagal memproses autentikasi Google.' },
      { status: 500 }
    )
  }
}

