'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>
}) {
  const router = useRouter()
  const { login } = useAuth()
  const sp = use(searchParams)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(
    sp.error === 'unauthorized_role'
      ? 'Akses ditolak: Akun Anda adalah akun Penumpang. Silakan masuk menggunakan akun Staf Admin.'
      : sp.error === 'auth_required'
      ? 'Silakan masuk dengan akun Administrator untuk mengakses dashboard operasional.'
      : ''
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')

    try {
      const res = await login(email, password)
      if (!res.success) {
        throw new Error(res.error || 'Email atau password staf salah.')
      }

      // Check cookie or state
      const target = sp.callbackUrl || '/admin'
      router.push(target)
      router.refresh()
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal masuk sebagai admin.')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickAdminLogin = async () => {
    setLoading(true)
    setErrorMessage('')
    try {
      const res = await login('admin@ruteku.id')
      if (res.success) {
        const target = sp.callbackUrl || '/admin'
        router.push(target)
        router.refresh()
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal masuk.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A1F26] text-white flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md z-10 space-y-6">
        {/* Back to main portal link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Kembali ke Beranda Penumpang</span>
        </Link>

        {/* Card */}
        <div className="bg-[#112D36]/90 border border-slate-700/60 rounded-3xl p-7 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
          {/* Logo & Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/40 text-primary-light flex items-center justify-center mx-auto mb-3">
              <ShieldCheck size={28} className="text-[#14B8A6]" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Portal Operasional Admin
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
              Dashboard manifest penumpang, operasional armada, dan manajemen rilis kursi RuteKu.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-start gap-2.5">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="leading-snug">{errorMessage}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Email Staf / Operator
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@ruteku.id"
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-[#091B22] border border-slate-700 text-white text-xs sm:text-sm outline-none focus:border-[#14B8A6] focus:ring-1 focus:ring-[#14B8A6] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-[#091B22] border border-slate-700 text-white text-xs sm:text-sm outline-none focus:border-[#14B8A6] focus:ring-1 focus:ring-[#14B8A6] transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-[#0B6E78] hover:bg-[#08525A] text-white font-bold text-xs sm:text-sm transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Memverifikasi...' : 'Masuk ke Dashboard Admin'}
            </button>
          </form>

          {/* Quick Simulation Button for Evaluation/Demo */}
          <div className="pt-4 border-t border-slate-700/60 space-y-2.5">
            <p className="text-[11px] font-bold text-slate-400 text-center uppercase tracking-wider">
              Akses Cepat Pengujian (Evaluasi RPL)
            </p>
            <button
              type="button"
              disabled={loading}
              onClick={handleQuickAdminLogin}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-600 text-xs font-bold text-emerald-400 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 size={15} />
              <span>Masuk sebagai Admin (admin@ruteku.id)</span>
            </button>
          </div>
        </div>

        {/* Security badge footer */}
        <div className="text-center text-[11px] text-slate-500">
          Dilindungi oleh Next.js Edge Middleware · Autentikasi Berbasis Peran (RBAC)
        </div>
      </div>
    </div>
  )
}
