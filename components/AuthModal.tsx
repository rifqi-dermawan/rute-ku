'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  Clock,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'

function GoogleIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  )
}

export default function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalConfig,
    login,
    register,
    loginWithGoogle,
  } = useAuth()

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loginName, setLoginName] = useState('')
  const [emailOrPhone, setEmailOrPhone] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirmPassword, setRegConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Sync mode with modal config when opened
  useEffect(() => {
    if (isAuthModalOpen) {
      setMode(authModalConfig?.mode || 'login')
      setError(null)
      setSuccessMessage(null)
      setRegConfirmPassword('')
      setShowPassword(false)
      setShowConfirmPassword(false)
    }
  }, [isAuthModalOpen, authModalConfig])

  if (!isAuthModalOpen) return null

  const banner = authModalConfig?.bannerInfo

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    if (!loginName.trim()) {
      setError('Nama lengkap wajib diisi.')
      return
    }
    if (!emailOrPhone.trim() || !emailOrPhone.includes('@')) {
      setError('Alamat email tidak valid.')
      return
    }
    if (!password.trim()) {
      setError('Kata sandi wajib diisi.')
      return
    }

    setIsLoading(true)
    const res = await login(emailOrPhone, password, loginName)
    setIsLoading(false)

    if (res.success) {
      closeAuthModal()
      const activeUser = res.user || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('ruteku_auth_user') || 'null') : null)
      if (authModalConfig?.onSuccess && activeUser) {
        authModalConfig.onSuccess(activeUser)
      }
      if (authModalConfig?.redirectUrl && typeof window !== 'undefined') {
        window.location.href = authModalConfig.redirectUrl
      }
    } else {
      setError(res.error || 'Gagal masuk akun. Silakan periksa kembali data Anda.')
    }
  }

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    if (!name.trim()) {
      setError('Nama lengkap wajib diisi.')
      return
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setError('Alamat email tidak valid.')
      return
    }
    if (regPassword.length < 6) {
      setError('Kata sandi minimal 6 karakter.')
      return
    }
    if (regPassword !== regConfirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.')
      return
    }

    setIsLoading(true)
    const res = await register({
      name,
      email: regEmail,
      password: regPassword,
    })
    setIsLoading(false)

    if (res.success) {
      setSuccessMessage('Pendaftaran berhasil! Silakan masuk dengan akun Anda.')
      setTimeout(() => {
        setMode('login')
        setLoginName('')
        setEmailOrPhone('')
        setPassword('')
        setShowPassword(false)
        setName('')
        setRegEmail('')
        setRegPassword('')
        setRegConfirmPassword('')
        setShowConfirmPassword(false)
        setSuccessMessage(null)
      }, 1500)
    } else {
      setError(res.error || 'Gagal mendaftar akun.')
    }
  }

  const handleGoogleClick = async () => {
    setError(null)
    const res = await loginWithGoogle(undefined, undefined, {
      returnTo: authModalConfig?.redirectUrl || (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/'),
    })
    if (res.redirecting) return
    if (!res.success) {
      setError(res.error || 'Gagal memproses login Google.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-[#102434] rounded-2xl sm:rounded-3xl shadow-2xl border border-borderCol dark:border-white/10 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Banner Pemesanan Berlangsung (jika dibuka dari alur booking) */}
        {banner && (
          <div className="bg-primary px-4 py-2.5 text-white flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-2 truncate">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse flex-shrink-0" />
              <span className="truncate">
                {banner.from} &rarr; {banner.to} (Kursi {banner.seats?.join(', ')})
              </span>
            </div>
            {banner.timeLeftFormatted && (
              <div className="flex items-center gap-1 font-mono font-bold bg-white/20 px-2 py-0.5 rounded-full flex-shrink-0">
                <Clock size={12} />
                <span>{banner.timeLeftFormatted}</span>
              </div>
            )}
          </div>
        )}

        {/* Modal Header */}
        <div className="p-4 sm:p-6 pb-2 sm:pb-3 flex items-start justify-between">
          <div>
            <h2 className="text-lg sm:text-2xl font-black text-ink dark:text-white tracking-tight">
              {mode === 'login' ? 'Masuk ke RuteKu' : 'Daftar Akun Baru'}
            </h2>
            <p className="text-xs sm:text-sm text-muted dark:text-gray-400 mt-0.5">
              {mode === 'login'
                ? 'Kelola e-tiket dan riwayat perjalanan Anda dengan aman.'
                : 'Pesan tiket bus antarkota dengan proses yang cepat dan privat.'}
            </p>
          </div>
          <button
            type="button"
            onClick={closeAuthModal}
            className="p-1.5 rounded-full text-muted hover:text-ink hover:bg-surface dark:hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content Scrollable */}
        <div className="p-4 sm:p-6 pt-0 overflow-y-auto space-y-4">
          {/* Tombol Google OAuth */}
          <div className="space-y-2">
            <button
              type="button"
              disabled={isLoading}
              onClick={handleGoogleClick}
              className="w-full py-2.5 px-4 rounded-xl border border-borderCol dark:border-white/15 bg-white dark:bg-white/5 hover:bg-surface dark:hover:bg-white/10 text-ink dark:text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5 transition-all shadow-2xs cursor-pointer active:scale-[0.99]"
            >
              <GoogleIcon className="w-4 h-4 flex-shrink-0" />
              <span>Lanjutkan dengan Google</span>
            </button>

            <div className="relative flex items-center justify-center my-3">
              <div className="border-t border-borderCol/80 dark:border-white/10 w-full" />
              <span className="bg-white dark:bg-[#102434] px-3 text-[11px] font-semibold text-muted dark:text-gray-400 absolute">
                atau gunakan email & nomor HP
              </span>
            </div>
          </div>

          {/* Tab Switcher: Masuk vs Daftar */}
          <div className="flex bg-surface dark:bg-white/5 p-1 rounded-xl border border-borderCol/60 dark:border-white/10">
            <button
              type="button"
              onClick={() => {
                setMode('login')
                setError(null)
                setSuccessMessage(null)
                setShowPassword(false)
                setShowConfirmPassword(false)
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${mode === 'login'
                  ? 'bg-white dark:bg-primary text-primary dark:text-white shadow-2xs'
                  : 'text-muted dark:text-gray-400 hover:text-ink'
                }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register')
                setError(null)
                setSuccessMessage(null)
                setShowPassword(false)
                setShowConfirmPassword(false)
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${mode === 'register'
                  ? 'bg-white dark:bg-primary text-primary dark:text-white shadow-2xs'
                  : 'text-muted dark:text-gray-400 hover:text-ink'
                }`}
            >
              Daftar
            </button>
          </div>

          {/* Alert Messages */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 text-xs flex items-start gap-2">
              <AlertCircle size={15} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-start gap-2">
              <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form Masuk */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-ink dark:text-gray-200 mb-1">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={loginName}
                    onChange={(e) => setLoginName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-borderCol dark:border-white/10 bg-white dark:bg-white/5 text-xs sm:text-sm text-ink dark:text-white placeholder:text-muted focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <UserIcon size={16} className="absolute left-3 top-3 text-muted" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink dark:text-gray-200 mb-1">
                  Alamat Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-borderCol dark:border-white/10 bg-white dark:bg-white/5 text-xs sm:text-sm text-ink dark:text-white placeholder:text-muted focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <Mail size={16} className="absolute left-3 top-3 text-muted" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink dark:text-gray-200 mb-1">
                  Kata Sandi
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi akun"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-borderCol dark:border-white/10 bg-white dark:bg-white/5 text-xs sm:text-sm text-ink dark:text-white placeholder:text-muted focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <Lock size={16} className="absolute left-3 top-3 text-muted" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted hover:text-ink"
                  >
                    {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk Sekarang</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Form Daftar */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-ink dark:text-gray-200 mb-1">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-borderCol dark:border-white/10 bg-white dark:bg-white/5 text-xs sm:text-sm text-ink dark:text-white placeholder:text-muted focus:outline-hidden focus:border-primary"
                  />
                  <UserIcon size={16} className="absolute left-3 top-3 text-muted" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink dark:text-gray-200 mb-1">
                  Alamat Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-borderCol dark:border-white/10 bg-white dark:bg-white/5 text-xs sm:text-sm text-ink dark:text-white placeholder:text-muted focus:outline-hidden focus:border-primary"
                  />
                  <Mail size={16} className="absolute left-3 top-3 text-muted" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink dark:text-gray-200 mb-1">
                  Kata Sandi Baru (Min. 6 Karakter)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-borderCol dark:border-white/10 bg-white dark:bg-white/5 text-xs sm:text-sm text-ink dark:text-white placeholder:text-muted focus:outline-hidden focus:border-primary"
                  />
                  <Lock size={16} className="absolute left-3 top-3 text-muted" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted hover:text-ink"
                  >
                    {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink dark:text-gray-200 mb-1">
                  Konfirmasi Kata Sandi
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-borderCol dark:border-white/10 bg-white dark:bg-white/5 text-xs sm:text-sm text-ink dark:text-white placeholder:text-muted focus:outline-hidden focus:border-primary"
                  />
                  <Lock size={16} className="absolute left-3 top-3 text-muted" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-muted hover:text-ink"
                  >
                    {showConfirmPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Mendaftarkan...</span>
                  </>
                ) : (
                  <>
                    <span>Daftar Akun Sekarang</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Privacy Note */}
          <div className="pt-2 border-t border-borderCol/60 dark:border-white/10 flex items-center justify-center gap-1.5 text-[11px] text-muted dark:text-gray-400">
            <ShieldCheck size={13} className="text-primary flex-shrink-0" />
            <span>Data Anda dilindungi enkripsi dan hanya untuk tiket perjalanan Anda.</span>
          </div>
        </div>
      </div>
    </div>
  )
}

