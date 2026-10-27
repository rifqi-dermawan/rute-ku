'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  Eye,
  EyeOff,
  Clock,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
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
  const [emailOrPhone, setEmailOrPhone] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirmPassword, setRegConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Sync mode with modal config when opened
  useEffect(() => {
    if (isAuthModalOpen) {
      setMode(authModalConfig?.mode || 'login')
      setError(null)
      setRegConfirmPassword('')
    }
  }, [isAuthModalOpen, authModalConfig])

  if (!isAuthModalOpen) return null

  const banner = authModalConfig?.bannerInfo

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!emailOrPhone.trim()) {
      setError('Silakan masukkan email atau nomor HP Anda.')
      return
    }

    setIsLoading(true)
    const res = await login(emailOrPhone, password)
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
      setError(res.error || 'Gagal masuk. Periksa kembali data Anda.')
    }
  }

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Nama lengkap wajib diisi.')
      return
    }
    if (!regEmail.trim()) {
      setError('Email wajib diisi.')
      return
    }
    if (!regPhone.trim()) {
      setError('Nomor HP wajib diisi.')
      return
    }
    if (!regPassword) {
      setError('Kata sandi wajib diisi.')
      return
    }
    if (regPassword.length < 6) {
      setError('Kata sandi minimal 6 karakter.')
      return
    }
    if (!regConfirmPassword) {
      setError('Konfirmasi kata sandi wajib diisi.')
      return
    }
    if (regPassword !== regConfirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok. Pastikan kata sandi sama.')
      return
    }

    setIsLoading(true)
    const res = await register({
      name,
      email: regEmail,
      phone: regPhone,
      password: regPassword,
    })
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
      setError(res.error || 'Gagal mendaftar.')
    }
  }


  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-ink/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAuthModal()
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-[#14232B] rounded-2xl max-w-md w-full shadow-2xl border border-borderCol dark:border-white/10 relative overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        
        {/* Top Decorative Header Accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-primary via-primary-dark to-secondary" />

        {/* Modal Close Button */}
        <button
          type="button"
          onClick={closeAuthModal}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface dark:bg-white/10 text-muted hover:text-ink dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer z-10"
          aria-label="Tutup"
        >
          <X size={16} />
        </button>

        {/* Scrollable Content Container */}
        <div className="p-5 sm:p-7 overflow-y-auto custom-scrollbar">

          {/* ── Lazy Registration / Checkpoint Context Banner (if triggered from Seat Step) ── */}
          {banner && (
            <div className="mb-5 p-3.5 sm:p-4 rounded-xl bg-primary-tint/70 dark:bg-primary-dark/30 border border-primary/30">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs">
                  <ShieldCheck size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-xs sm:text-sm text-ink dark:text-white">
                      Kursi Anda Ditahan Sementara!
                    </span>
                    {banner.timeLeftFormatted && (
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-primary dark:text-primary-tint bg-white dark:bg-black/30 px-2 py-0.5 rounded-full border border-primary/20">
                        <Clock size={11} /> {banner.timeLeftFormatted}
                      </span>
                    )}
                  </div>
                  {banner.seats && banner.seats.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="text-[11px] text-muted dark:text-gray-300">Kursi:</span>
                      {banner.seats.map((s) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 rounded-md bg-white dark:bg-black/40 text-primary dark:text-primary-tint border border-primary/30 text-[11px] font-mono font-bold"
                        >
                          {s}
                        </span>
                      ))}
                      {banner.from && banner.to && (
                        <span className="text-[11px] text-muted dark:text-gray-300 truncate">
                          ({banner.from} → {banner.to})
                        </span>
                      )}
                    </div>
                  )}
                  <p className="text-[11px] text-muted dark:text-gray-300 mt-2 leading-relaxed">
                    Masuk atau buat akun sebentar untuk mengamankan kursi Anda dan melanjutkan ke pengisian data penumpang.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Main Title & Subtitle */}
          <div className="text-center mb-5">
            <h2 className="text-xl font-black text-ink dark:text-white">
              {authModalConfig?.title || (mode === 'login' ? 'Masuk ke RuteKu' : 'Daftar Akun RuteKu')}
            </h2>
            <p className="text-xs text-muted dark:text-gray-400 mt-1.5 max-w-xs mx-auto">
              {authModalConfig?.description ||
                (mode === 'login'
                  ? 'Akses tiket, kelola riwayat pemesanan, dan nikmati kemudahan booking bus antarkota.'
                  : 'Daftar gratis dalam 30 detik untuk kemudahan pesan tiket bus antarkota.')}
            </p>
          </div>

          {/* Mode Switch Tabs */}
          <div className="flex p-1 bg-surface dark:bg-black/20 rounded-xl mb-5 border border-borderCol dark:border-white/10">
            <button
              type="button"
              onClick={() => {
                setMode('login')
                setError(null)
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-white dark:bg-[#1E333F] text-primary dark:text-white shadow-2xs'
                  : 'text-muted hover:text-ink dark:hover:text-white'
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register')
                setError(null)
                setRegConfirmPassword('')
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-white dark:bg-[#1E333F] text-primary dark:text-white shadow-2xs'
                  : 'text-muted hover:text-ink dark:hover:text-white'
              }`}
            >
              Daftar Akun Baru
            </button>
          </div>

          {/* Google OAuth Button */}
          <button
            type="button"
            disabled={isLoading}
            onClick={async () => {
              setIsLoading(true)
              setError(null)
              const res = await loginWithGoogle()
              setIsLoading(false)
              if (res.redirecting) {
                return
              }
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
                setError(res.error || 'Gagal masuk dengan Google.')
              }
            }}
            className="w-full h-11 rounded-xl border border-borderCol dark:border-white/15 bg-white dark:bg-[#1E333F] text-ink dark:text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all shadow-2xs hover:bg-surface dark:hover:bg-white/5 cursor-pointer mb-4"
          >
            <GoogleIcon className="w-4 h-4 flex-shrink-0" />
            <span>Lanjutkan dengan Google</span>
          </button>

          {/* Divider */}
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-borderCol dark:border-white/10" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-white dark:bg-[#14232B] px-2.5 text-muted dark:text-gray-400 font-bold tracking-wider">
                atau isi form di bawah
              </span>
            </div>
          </div>

          {/* Error Message Alert */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle size={15} className="text-error flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* ── Tab Content: MASUK ── */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink dark:text-gray-200 mb-1.5">
                  Email atau Nomor HP
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                    <Mail size={16} />
                  </div>
                  <input
                    type="text"
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    placeholder="nama@email.com atau 08123456789"
                    required
                    className="w-full h-11 pl-9 pr-3.5 border border-borderCol dark:border-white/15 dark:bg-black/20 rounded-input text-ink dark:text-white text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-ink dark:text-gray-200">
                    Kata Sandi
                  </label>
                  <button
                    type="button"
                    onClick={() => alert('Fitur pemulihan kata sandi telah dikirim ke email atau kontak WhatsApp Anda.')}
                    className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                  >
                    Lupa Kata Sandi?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi"
                    className="w-full h-11 pl-9 pr-10 border border-borderCol dark:border-white/15 dark:bg-black/20 rounded-input text-ink dark:text-white text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-ink cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer text-muted dark:text-gray-300">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded border-borderCol text-primary focus:ring-primary"
                  />
                  <span>Ingat saya di perangkat ini</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Masuk Sekarang</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ── Tab Content: DAFTAR ── */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-ink dark:text-gray-200 mb-1">
                  Nama Lengkap <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                    <UserIcon size={16} />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Rifqi Dermawan"
                    required
                    className="w-full h-10 pl-9 pr-3.5 border border-borderCol dark:border-white/15 dark:bg-black/20 rounded-input text-ink dark:text-white text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink dark:text-gray-200 mb-1">
                  Email Pemesan <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="nama@email.com"
                    required
                    className="w-full h-10 pl-9 pr-3.5 border border-borderCol dark:border-white/15 dark:bg-black/20 rounded-input text-ink dark:text-white text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink dark:text-gray-200 mb-1">
                  Nomor HP (WhatsApp) <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                    <Phone size={16} />
                  </div>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="081234567890"
                    required
                    className="w-full h-10 pl-9 pr-3.5 border border-borderCol dark:border-white/15 dark:bg-black/20 rounded-input text-ink dark:text-white text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink dark:text-gray-200 mb-1">
                  Kata Sandi <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Buat kata sandi minimal 6 karakter"
                    required
                    className="w-full h-10 pl-9 pr-10 border border-borderCol dark:border-white/15 dark:bg-black/20 rounded-input text-ink dark:text-white text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-ink cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink dark:text-gray-200 mb-1">
                  Konfirmasi Kata Sandi <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi Anda"
                    required
                    className={`w-full h-10 pl-9 pr-10 border rounded-input text-ink dark:text-white text-sm outline-none transition-all dark:bg-black/20 ${
                      regConfirmPassword && regPassword && regConfirmPassword !== regPassword
                        ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-400'
                        : regConfirmPassword && regPassword && regConfirmPassword === regPassword
                        ? 'border-emerald-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                        : 'border-borderCol dark:border-white/15 focus:border-primary focus:ring-1 focus:ring-primary'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-ink cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {regConfirmPassword && regPassword && regConfirmPassword !== regPassword && (
                  <p className="text-[11px] text-red-500 mt-1 font-medium animate-in fade-in">
                    Kata sandi tidak cocok
                  </p>
                )}
                {regConfirmPassword && regPassword && regConfirmPassword === regPassword && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium animate-in fade-in">
                    ✓ Kata sandi cocok
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-70"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Daftar & Lanjutkan</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Privacy Note */}
          <p className="mt-5 text-[11px] text-center text-muted dark:text-gray-400">
            Dengan masuk atau mendaftar, Anda menyetujui <span className="text-primary hover:underline cursor-pointer">Ketentuan Layanan</span> &amp; <span className="text-primary hover:underline cursor-pointer">Kebijakan Privasi</span> RuteKu.
          </p>
        </div>
      </div>
    </div>
  )
}
