'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Stepper from '@/components/Stepper'
import { useAuth } from '@/lib/auth-context'
import {
  ShieldCheck,
  Clock,
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'

// Official Google SVG Logo
function GoogleIcon({ className = 'w-5 h-5' }: { className?: string }) {
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

export default function BookingAuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ scheduleId: string }>
  searchParams: Promise<{
    seats?: string
    from?: string
    to?: string
    passengers?: string
    date?: string
    dep?: string
    arr?: string
    bus?: string
    cls?: string
    price?: string
    timeLeft?: string
  }>
}) {
  const { scheduleId } = use(params)
  const sp = use(searchParams)
  const router = useRouter()
  const { user, login, register, loginWithGoogle } = useAuth()

  const seats = sp.seats ? sp.seats.split(',') : ['5A']
  const from = sp.from || 'Jakarta'
  const to = sp.to || 'Bandung'
  const maxSelect = sp.passengers || '1'
  const tripDate = sp.date || 'Sab, 10 Okt 2026'
  const depTime = sp.dep || '08:00'
  const arrTime = sp.arr || '11:30'
  const busName = sp.bus ? decodeURIComponent(sp.bus) : 'Nusa Trans'
  const busClass = sp.cls ? decodeURIComponent(sp.cls) : 'Executive 2–2'
  const pricePerSeat = sp.price || '125000'

  // Hold Timer (synced with seat selection)
  const [timeLeft, setTimeLeft] = useState(parseInt(sp.timeLeft || '510'))
  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(t)
  }, [])

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const targetPassengerUrl = `/booking/${scheduleId}/passenger?seats=${seats.join(
    ','
  )}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&passengers=${maxSelect}&date=${encodeURIComponent(
    tripDate
  )}&dep=${encodeURIComponent(depTime)}&arr=${encodeURIComponent(arrTime)}&bus=${encodeURIComponent(
    busName
  )}&cls=${encodeURIComponent(busClass)}&price=${pricePerSeat}`

  // If already logged in, automatically proceed to Step 3 (Passenger)
  useEffect(() => {
    if (user) {
      router.replace(targetPassengerUrl)
    }
  }, [user, router, targetPassengerUrl])

  // Manual Auth States (Login / Register without OTP)
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
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successInfo, setSuccessInfo] = useState('')

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessInfo('')

    if (!loginName.trim()) {
      setErrorMessage('Nama lengkap wajib diisi.')
      return
    }
    if (!emailOrPhone.trim() || !emailOrPhone.includes('@')) {
      setErrorMessage('Alamat email tidak valid.')
      return
    }
    if (!password.trim()) {
      setErrorMessage('Kata sandi wajib diisi.')
      return
    }

    setLoading(true)
    try {
      const res = await login(emailOrPhone, password, loginName)
      if (res.success) {
        router.push(targetPassengerUrl)
      } else {
        setErrorMessage(res.error || 'Gagal masuk akun. Silakan periksa kembali data Anda.')
      }
    } catch {
      setErrorMessage('Terjadi kesalahan jaringan saat memproses login.')
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessInfo('')

    if (!name.trim()) {
      setErrorMessage('Nama lengkap wajib diisi.')
      return
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setErrorMessage('Alamat email tidak valid.')
      return
    }
    if (regPassword.length < 6) {
      setErrorMessage('Kata sandi minimal 6 karakter.')
      return
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Konfirmasi kata sandi tidak cocok.')
      return
    }

    setLoading(true)
    try {
      const res = await register({
        name,
        email: regEmail,
        password: regPassword,
      })

      if (res.success) {
        setSuccessInfo('Pendaftaran berhasil! Silakan masuk dengan akun Anda.')
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
          setSuccessInfo('')
        }, 1200)
      } else {
        setErrorMessage(res.error || 'Gagal mendaftar akun.')
      }
    } catch {
      setErrorMessage('Terjadi kendala jaringan saat mendaftar.')
    } finally {
      setLoading(false)
    }
  }

  // Handle Google Auth
  const handleGoogleAuth = async (directEmail?: string) => {
    setLoading(true)
    setErrorMessage('')
    try {
      const currentFullUrl =
        typeof window !== 'undefined'
          ? window.location.origin + targetPassengerUrl
          : targetPassengerUrl
      const res = await loginWithGoogle(directEmail, undefined, { returnTo: currentFullUrl })
      if (res.redirecting) return
      if (res.success && res.user) {
        router.push(targetPassengerUrl)
      } else {
        setErrorMessage(res.error || 'Gagal memproses login Google.')
      }
    } catch {
      setErrorMessage('Terjadi kendala saat menghubungkan ke akun Google.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface pb-20">
      <Stepper currentStep={2} />

      <main className="max-w-xl mx-auto px-4 py-6 sm:py-10">
        {/* Hold Timer Card */}
        <div className="mb-6 p-4 rounded-2xl bg-primary-tint/60 border border-primary/25 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center flex-shrink-0 shadow-xs">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-ink">Kursi Anda Ditahan Sementara</p>
              <p className="text-xs text-muted">
                {from} &rarr; {to} · Kursi <strong>{seats.join(', ')}</strong>
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="font-mono text-base sm:text-lg font-black text-primary block">
              {fmtTime(timeLeft)}
            </span>
            <span className="text-[10px] text-muted">sisa waktu</span>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-[#102434] rounded-3xl border border-borderCol dark:border-white/10 p-6 sm:p-8 shadow-xs">
          <div className="text-center mb-6">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-primary-tint dark:bg-primary/20 text-primary flex items-center justify-center mb-3">
              <ShieldCheck size={26} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-ink dark:text-white tracking-tight">
              {mode === 'login' ? 'Masuk untuk Melanjutkan' : 'Daftar Akun Baru'}
            </h1>
            <p className="text-xs sm:text-sm text-muted dark:text-gray-400 mt-1 max-w-sm mx-auto">
              E-tiket dan riwayat pemesanan Anda tersimpan secara privat dan aman di akun Anda.
            </p>
          </div>

          {/* Error & Info Alerts */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 text-xs flex items-start gap-2">
              <AlertCircle size={16} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successInfo && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>{successInfo}</span>
            </div>
          )}

          {/* Google 1-Click Button */}
          <div className="space-y-4">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleGoogleAuth()}
              className="w-full py-3 px-4 rounded-xl border border-borderCol dark:border-white/15 bg-white dark:bg-white/5 hover:bg-surface dark:hover:bg-white/10 text-ink dark:text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-3 transition-all shadow-2xs cursor-pointer active:scale-[0.99]"
            >
              <GoogleIcon className="w-5 h-5 flex-shrink-0" />
              <span>Lanjutkan dengan Google</span>
            </button>

            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-borderCol/80 dark:border-white/10 w-full" />
              <span className="bg-white dark:bg-[#102434] px-3 text-[11px] font-semibold text-muted dark:text-gray-400 absolute">
                atau gunakan email &amp; kata sandi
              </span>
            </div>

            {/* Tab Switcher: Masuk vs Daftar */}
            <div className="flex bg-surface dark:bg-white/5 p-1 rounded-xl border border-borderCol/60 dark:border-white/10">
              <button
                type="button"
                onClick={() => {
                  setMode('login')
                  setErrorMessage('')
                  setSuccessInfo('')
                  setShowPassword(false)
                  setShowConfirmPassword(false)
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  mode === 'login'
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
                  setErrorMessage('')
                  setSuccessInfo('')
                  setShowPassword(false)
                  setShowConfirmPassword(false)
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  mode === 'register'
                    ? 'bg-white dark:bg-primary text-primary dark:text-white shadow-2xs'
                    : 'text-muted dark:text-gray-400 hover:text-ink'
                }`}
              >
                Daftar
              </button>
            </div>

            {/* Form Masuk */}
            {mode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-ink dark:text-gray-200 mb-1.5">
                    Nama Lengkap
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={loginName}
                      onChange={e => setLoginName(e.target.value)}
                      placeholder="Contoh: Budi Santoso"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-borderCol dark:border-white/10 bg-white dark:bg-white/5 text-xs sm:text-sm text-ink dark:text-white placeholder:text-muted focus:outline-hidden focus:border-primary"
                    />
                    <UserIcon size={16} className="absolute left-3.5 top-3 text-muted" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink dark:text-gray-200 mb-1.5">
                    Alamat Email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={emailOrPhone}
                      onChange={e => setEmailOrPhone(e.target.value)}
                      placeholder="nama@email.com"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-borderCol dark:border-white/10 bg-white dark:bg-white/5 text-xs sm:text-sm text-ink dark:text-white placeholder:text-muted focus:outline-hidden focus:border-primary"
                    />
                    <Mail size={16} className="absolute left-3.5 top-3 text-muted" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink dark:text-gray-200 mb-1.5">
                    Kata Sandi
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Masukkan kata sandi akun"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-borderCol dark:border-white/10 bg-white dark:bg-white/5 text-xs sm:text-sm text-ink dark:text-white placeholder:text-muted focus:outline-hidden focus:border-primary"
                    />
                    <Lock size={16} className="absolute left-3.5 top-3 text-muted" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-muted hover:text-ink"
                    >
                      {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <>
                      <span>Masuk &amp; Lanjutkan</span>
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
                  <label className="block text-xs font-bold text-ink dark:text-gray-200 mb-1.5">
                    Nama Lengkap
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Contoh: Budi Santoso"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-borderCol dark:border-white/10 bg-white dark:bg-white/5 text-xs sm:text-sm text-ink dark:text-white placeholder:text-muted focus:outline-hidden focus:border-primary"
                    />
                    <UserIcon size={16} className="absolute left-3.5 top-3 text-muted" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink dark:text-gray-200 mb-1.5">
                    Alamat Email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                      placeholder="nama@email.com"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-borderCol dark:border-white/10 bg-white dark:bg-white/5 text-xs sm:text-sm text-ink dark:text-white placeholder:text-muted focus:outline-hidden focus:border-primary"
                    />
                    <Mail size={16} className="absolute left-3.5 top-3 text-muted" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink dark:text-gray-200 mb-1.5">
                    Kata Sandi Baru (Min. 6 Karakter)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-borderCol dark:border-white/10 bg-white dark:bg-white/5 text-xs sm:text-sm text-ink dark:text-white placeholder:text-muted focus:outline-hidden focus:border-primary"
                    />
                    <Lock size={16} className="absolute left-3.5 top-3 text-muted" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-muted hover:text-ink"
                    >
                      {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink dark:text-gray-200 mb-1.5">
                    Konfirmasi Kata Sandi
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={regConfirmPassword}
                      onChange={e => setRegConfirmPassword(e.target.value)}
                      placeholder="Ulangi kata sandi"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-borderCol dark:border-white/10 bg-white dark:bg-white/5 text-xs sm:text-sm text-ink dark:text-white placeholder:text-muted focus:outline-hidden focus:border-primary"
                    />
                    <Lock size={16} className="absolute left-3.5 top-3 text-muted" />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-3 text-muted hover:text-ink"
                    >
                      {showConfirmPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
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
          </div>
        </div>

        {/* Kembali ke pemilihan kursi */}
        <div className="mt-4 text-center">
          <Link
            href={`/booking/${scheduleId}/seat?from=${encodeURIComponent(from)}&to=${encodeURIComponent(
              to
            )}&passengers=${maxSelect}&date=${encodeURIComponent(tripDate)}`}
            className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink font-semibold"
          >
            <ArrowLeft size={14} />
            <span>Kembali ke pemilihan kursi</span>
          </Link>
        </div>
      </main>
    </div>
  )
}
