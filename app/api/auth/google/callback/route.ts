import { NextRequest, NextResponse } from 'next/server'
import { getGoogleRedirectUri } from '../url/route'

/**
 * GET /api/auth/google/callback
 * Callback resmi dari Google OAuth 2.0 setelah pengguna memilih akun Google.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const state = searchParams.get('state')
  const returnTo = state ? decodeURIComponent(state) : '/'

  if (error) {
    return NextResponse.redirect(
      new URL(`/?auth_error=${encodeURIComponent('Login Google dibatalkan atau ditolak: ' + error)}`, req.url)
    )
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(`/?auth_error=${encodeURIComponent('Kode otorisasi Google tidak ditemukan.')}`, req.url)
    )
  }

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL(
        `/?auth_error=${encodeURIComponent('Kredensial GOOGLE_CLIENT_ID atau GOOGLE_CLIENT_SECRET belum lengkap di .env')}`,
        req.url
      )
    )
  }

  const redirectUri = getGoogleRedirectUri(req)

  try {
    // 1. Tukar authorization code dengan Google Token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      const errText = await tokenRes.text()
      console.error('Google token exchange error:', errText)
      return NextResponse.redirect(
        new URL(`/?auth_error=${encodeURIComponent('Gagal menukarkan token dengan server Google.')}`, req.url)
      )
    }

    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token

    // 2. Dapatkan data profil asli pengguna dari Google
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!userRes.ok) {
      return NextResponse.redirect(
        new URL(`/?auth_error=${encodeURIComponent('Gagal memuat profil pengguna dari Google.')}`, req.url)
      )
    }

    const gUser = await userRes.json()
    const email = gUser.email?.trim()?.toLowerCase()
    const name = gUser.name || gUser.given_name || email.split('@')[0]
    const avatar = gUser.picture || 'https://lh3.googleusercontent.com/a/default-user'
    const userId = `usr-g-${Date.now()}`

    const authUser = {
      id: userId,
      name,
      email,
      phone: '0812' + Math.floor(10000000 + Math.random() * 90000000),
      avatar,
      role: 'USER',
    }

    // 3. Buat response HTML yang menyinkronkan localStorage & cookies, lalu redirect
    const userJson = JSON.stringify(authUser)
    const html = `
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="utf-8" />
          <title>Autentikasi Google Berhasil - RuteKu</title>
          <script>
            try {
              const user = ${userJson};
              localStorage.setItem('ruteku_auth_user', JSON.stringify(user));
              window.dispatchEvent(new Event('storage'));
            } catch (e) {
              console.error(e);
            }
            window.location.replace('${returnTo}');
          </script>
        </head>
        <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #F4F9FA; color: #0F2A33;">
          <div style="text-align: center; padding: 24px; background: white; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); max-width: 360px;">
            <div style="width: 40px; height: 40px; border: 3px solid #0B6E78; border-top-color: transparent; border-radius: 50%; margin: 0 auto 16px; animation: spin 0.8s linear infinite;"></div>
            <h2 style="font-size: 16px; font-weight: bold; margin-bottom: 8px;">Masuk dengan Google Berhasil</h2>
            <p style="font-size: 12px; color: #4A6068;">Menghubungkan akun Anda ke RuteKu...</p>
          </div>
          <style>
            @keyframes spin { to { transform: rotate(360deg); } }
          </style>
        </body>
      </html>
    `

    const response = new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })

    // Set cookie sesi
    response.cookies.set('ruteku_user_id', authUser.id, {
      path: '/',
      maxAge: 604800,
      sameSite: 'lax',
    })
    response.cookies.set('ruteku_user_email', encodeURIComponent(authUser.email), {
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
    console.error('Google OAuth callback fatal error:', err)
    return NextResponse.redirect(
      new URL(
        `/?auth_error=${encodeURIComponent(err.message || 'Terjadi kesalahan sistem saat autentikasi Google.')}`,
        req.url
      )
    )
  }
}

