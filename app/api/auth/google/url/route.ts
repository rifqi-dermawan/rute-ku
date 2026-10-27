import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/auth/google/url
 * Menghasilkan URL Google OAuth resmi untuk login dengan akun Google asli.
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || clientId.includes('MASUKKAN') || clientId.includes('ISI_')) {
    return NextResponse.json({
      success: false,
      configured: false,
      error: 'NEXT_PUBLIC_GOOGLE_CLIENT_ID belum diatur di file .env',
    }, { status: 400 })
  }

  const { searchParams } = new URL(req.url)
  const returnTo = searchParams.get('returnTo') || '/'

  // Tentukan Base URL aplikasi (localhost atau domain produksi)
  const origin = req.headers.get('origin') || req.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const redirectUri = `${origin}/api/auth/google/callback`

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state: encodeURIComponent(returnTo),
  })

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

  return NextResponse.json({
    success: true,
    configured: true,
    url: authUrl,
    redirectUri,
  })
}
