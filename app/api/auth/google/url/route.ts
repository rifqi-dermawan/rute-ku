import { NextRequest, NextResponse } from 'next/server'

/**
 * Mendapatkan Redirect URI yang tepat dan konsisten
 * Mendukung Vercel, reverse proxy HTTPS, domain custom, dan localhost
 */
export function getGoogleRedirectUri(req: NextRequest): string {
  const { searchParams } = new URL(req.url)
  const clientOrigin = searchParams.get('origin')

  // 1. Jika diuji di localhost/lokal, selalu gunakan localhost
  if (clientOrigin && (clientOrigin.includes('localhost') || clientOrigin.includes('127.0.0.1'))) {
    return `${clientOrigin.replace(/\/$/, '')}/api/auth/google/callback`
  }

  // 2. Cek environment variable NEXT_PUBLIC_APP_URL jika disetel ke domain publik di Vercel
  const envAppUrl = process.env.NEXT_PUBLIC_APP_URL
  if (envAppUrl && !envAppUrl.includes('localhost') && !envAppUrl.includes('MASUKKAN') && envAppUrl.startsWith('http')) {
    return `${envAppUrl.replace(/\/$/, '')}/api/auth/google/callback`
  }

  // 3. Gunakan origin dari browser pengguna secara presisi
  if (clientOrigin && clientOrigin.startsWith('http')) {
    return `${clientOrigin.replace(/\/$/, '')}/api/auth/google/callback`
  }

  // 4. Deteksi otomatis dari header host / reverse proxy (Vercel)
  const forwardedHost = req.headers.get('x-forwarded-host') || req.headers.get('host')
  const forwardedProto = req.headers.get('x-forwarded-proto')

  if (forwardedHost) {
    const isLocal = forwardedHost.includes('localhost') || forwardedHost.includes('127.0.0.1')
    const proto = isLocal ? 'http' : (forwardedProto || 'https')
    return `${proto}://${forwardedHost}/api/auth/google/callback`
  }

  return `${req.nextUrl.origin}/api/auth/google/callback`
}

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

  // Redirect URI yang wajib didaftarkan di Google Cloud Console
  const redirectUri = getGoogleRedirectUri(req)

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
