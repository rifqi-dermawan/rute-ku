import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Next.js Middleware untuk Proteksi Akses Berbasis Peran (RBAC)
 *
 * Mencegah pengguna biasa atau tamu tanpa izin mengakses halaman operasional
 * internal dan manifest data penumpang di rute /admin.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // 1. Lewatkan halaman login admin itu sendiri agar tidak redirect berulang (infinite loop)
  if (pathname === '/admin/login') {
    // Jika sudah login sebagai ADMIN dan membuka halaman login, langsung arahkan ke dashboard
    const userRole = req.cookies.get('ruteku_user_role')?.value
    if (userRole === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin', req.url))
    }
    return NextResponse.next()
  }

  // 2. Proteksi Rute /admin dan seluruh sub-rutenya
  if (pathname.startsWith('/admin')) {
    const userId = req.cookies.get('ruteku_user_id')?.value
    const userRole = req.cookies.get('ruteku_user_role')?.value

    // Jika belum login atau bukan role ADMIN, tolak akses dan arahkan ke portal login admin
    if (!userId || userRole !== 'ADMIN') {
      const loginUrl = new URL('/admin/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      loginUrl.searchParams.set('error', userRole === 'USER' ? 'unauthorized_role' : 'auth_required')
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

// Konfigurasi Matcher: hanya jalankan middleware pada rute admin
export const config = {
  matcher: ['/admin/:path*'],
}
