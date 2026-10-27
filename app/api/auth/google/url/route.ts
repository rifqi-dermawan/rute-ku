import { NextRequest, NextResponse } from 'next/server'

/**
 * Mendapatkan Redirect URI yang tepat dan konsisten
 * Mendukung Vercel, reverse proxy HTTPS, domain custom, dan localhost
 */
export function getGoogleRedirectUri(req: NextRequest): string {
  const envAppUrl = process.env.NEXT_PUBLIC_APP_URL
  if (envAppUrl && !envAppUrl.includes('localhost') && !envAppUrl.includes('MASUKKAN')) {
    return `${envAppUrl.replace(/\/$/, '')}/api/auth/google/callback`
  }

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
