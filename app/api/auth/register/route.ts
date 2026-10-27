import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/auth/register
 * Mendaftarkan akun pengguna baru dan otomatis mengaktifkan sesi login (auto-login).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { id, name, email, phone } = body

    if (!email || !name) {
      return NextResponse.json(
        { success: false, error: 'Email dan nama lengkap wajib diisi.' },
        { status: 400 }
      )
    }

    const cleanEmail = String(email).trim().toLowerCase()
    const cleanName = String(name).trim()
    const cleanPhone = phone ? String(phone).trim() : null
    const userId = id || `usr-${Date.now()}`

    // Upsert ke database Prisma jika terhubung
    let dbUser = null
    try {
      const existing = await prisma.user.findUnique({ where: { email: cleanEmail } })
      if (!existing) {
        dbUser = await prisma.user.create({
          data: {
            id: userId,
            email: cleanEmail,
            name: cleanName,
            phone: cleanPhone,
            role: 'USER',
          },
        })
      } else {
        dbUser = existing
      }
    } catch (e) {
      console.warn('Prisma sync skipped during registration:', e)
    }

    const user = {
      id: dbUser ? dbUser.id : userId,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone || '',
      role: 'USER',
    }

    const response = NextResponse.json({
      success: true,
      message: 'Pendaftaran berhasil dan otomatis masuk.',
      user,
    })

    // Pasang cookie sesi agar pengguna langsung terautentikasi di level server
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
      { success: false, error: err.message || 'Gagal memproses pendaftaran akun.' },
      { status: 500 }
    )
  }
}
