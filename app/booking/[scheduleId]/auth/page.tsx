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
  const { user, loginWithGoogle, sendOtp, loginWithOtp, openAuthModal } = useAuth()

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

  // Email OTP States
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'input_email' | 'input_otp'>('input_email')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successInfo, setSuccessInfo] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null)

  // Google OAuth Modal state
  const [showGoogleModal, setShowGoogleModal] = useState(false)
  const [customGoogleEmail, setCustomGoogleEmail] = useState('')

  // Cooldown countdown for resending OTP
  useEffect(() => {
    if (resendCooldown <= 0) return
    const interval = setInterval(() => {
      setResendCooldown(prev => prev - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [resendCooldown])

  // Handle Send OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setErrorMessage('')
    setSuccessInfo('')

    if (!email.trim() || !email.includes('@') || !email.includes('.')) {
      setErrorMessage('Silakan masukkan alamat email yang valid (contoh: nama@gmail.com).')
      return
    }

    setLoading(true)
    try {
      const res = await sendOtp(email.trim())
      if (res.success) {
        setStep('input_otp')
        setSuccessInfo(res.message || `Kode verifikasi telah dikirim ke ${email}`)
        setResendCooldown(60)
        if (res.devCode) {
          setDevOtpHint(res.devCode)
        }
      } else {
        setErrorMessage(res.error || 'Gagal mengirim kode OTP. Coba lagi.')
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi gangguan koneksi.')
    } finally {
      setLoading(false)
    }
  }

  // Handle Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')

    if (!otp.trim() || otp.trim().length < 6) {
      setErrorMessage('Masukkan 6 digit kode verifikasi yang Anda terima.')
      return
    }

    setLoading(true)
    try {
      const res = await loginWithOtp(email.trim(), otp.trim())
      if (res.success) {
        // Logged in! Forward to passenger step
        router.push(targetPassengerUrl)
      } else {
        setErrorMessage(res.error || 'Kode verifikasi salah atau telah kadaluarsa.')
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memverifikasi kode.')
    } finally {
      setLoading(false)
    }
  }

  // Handle Google OAuth Login
  const handleGoogleAuth = async (selectedEmail?: string) => {
    setLoading(true)
    setErrorMessage('')
    try {
      // 1. Jika pengguna memilih email tertentu dari modal
      if (selectedEmail || (customGoogleEmail && customGoogleEmail.trim())) {
        setShowGoogleModal(false)
        const targetEmail = (selectedEmail || customGoogleEmail).trim()
        const namePart = targetEmail.split('@')[0]
        const res = await loginWithGoogle(targetEmail, namePart)
        if (res.success && res.user) {
          router.push(targetPassengerUrl)
        } else {
          setErrorMessage(res.error || 'Autentikasi gagal.')
        }
        return
      }

      // 2. Jika belum memilih email spesifik, coba Google OAuth resmi
      const res = await loginWithGoogle(undefined, undefined, { returnTo: targetPassengerUrl })
      if (res.redirecting) {
        return
      }
      if (res.success && res.user) {
        router.push(targetPassengerUrl)
        return
      }
      if (res.isConfigMissing) {
        // Tampilkan modal fallback agar pengguna bisa memasukkan email miliknya sendiri
        setShowGoogleModal(true)
      } else {
        setErrorMessage(res.error || 'Autentikasi Google gagal.')
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Kendala koneksi Google.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface pb-20">
      {/* ── Stepper ─────────────────────────────────────────────────── */}
      <Stepper currentStep={2} />

      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        {/* Navigation Back */}
        <Link
          href={`/booking/${scheduleId}/seat?passengers=${maxSelect}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${encodeURIComponent(tripDate)}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Kembali ke Pemilihan Kursi</span>
        </Link>

        {/* ── Hold Seats Alert Banner ───────────────────────────────── */}
        <div className="bg-white border border-primary/20 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary-tint text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-extrabold text-ink">
                  Kursi Anda Sedang Ditahan
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-mono text-xs font-bold border border-primary/20">
                  {seats.join(', ')}
                </span>
              </div>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                {from} → {to} · {tripDate} ({depTime} WIB) · {busName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FEF6EE] border border-[#F9DBAF] text-[#93370D] font-mono text-xs font-bold rounded-xl flex-shrink-0">
            <Clock size={14} />
            <span>Sisa waktu {fmtTime(timeLeft)}</span>
          </div>
        </div>

        {/* ── Main Verification Card ─────────────────────────────────── */}
        <div className="bg-white border border-borderCol rounded-3xl p-6 sm:p-10 shadow-sm max-w-xl mx-auto">
          {/* Card Header */}
          <div className="text-center space-y-2 mb-8">
            <span className="text-xs font-bold text-primary uppercase tracking-wider block">
              Langkah 2.5 · Autentikasi Pemesan
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
              Masuk untuk Lanjut Pemesanan
            </h1>
            <p className="text-xs sm:text-sm text-muted max-w-md mx-auto leading-relaxed">
              Verifikasi akun Anda untuk menghubungkan e-tiket resmi dan menyimpan data perjalanan secara aman.
            </p>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-error text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle size={16} className="text-error flex-shrink-0 mt-0.5" />
              <p className="leading-relaxed">{errorMessage}</p>
            </div>
          )}

          {/* Success Info Alert */}
          {successInfo && (
            <div className="mb-5 p-3.5 rounded-xl bg-green-50 border border-green-200 text-success text-xs flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 size={16} className="text-success flex-shrink-0 mt-0.5" />
              <p className="leading-relaxed">{successInfo}</p>
            </div>
          )}

          {/* ── OPSI 1: Google OAuth Button ───────────────────────────── */}
          <div className="space-y-4">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleGoogleAuth()}
              className="w-full h-12 rounded-2xl border-2 border-borderCol hover:border-slate-400 bg-white text-ink font-bold text-sm flex items-center justify-center gap-3 transition-all shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-60"
            >
              <GoogleIcon className="w-5 h-5 flex-shrink-0" />
              <span>Lanjutkan dengan Google</span>
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-borderCol" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-muted font-bold tracking-wider">
                  atau gunakan email
                </span>
              </div>
            </div>

            {/* ── OPSI 2: Email OTP Form ──────────────────────────────── */}
            {step === 'input_email' ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5">
                    Alamat Email Pemesan
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
                      <Mail size={18} />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="nama@email.com"
                      className="w-full h-12 pl-10 pr-4 rounded-xl border border-borderCol text-sm text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-muted mt-1.5">
                    Kami akan mengirimkan 6-digit kode verifikasi ke alamat email ini.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Kirim Kode Verifikasi</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4 animate-in fade-in">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-ink">
                      Masukkan 6-Digit Kode Verifikasi
                    </label>
                    <button
                      type="button"
                      onClick={() => setStep('input_email')}
                      className="text-[11px] font-bold text-primary hover:underline"
                    >
                      Ubah Email
                    </button>
                  </div>

                  <div className="p-3 bg-surface rounded-xl border border-borderCol text-xs text-ink/80 flex items-center justify-between mb-3">
                    <span className="font-semibold truncate">{email}</span>
                    <span className="text-[11px] text-success font-bold flex items-center gap-1">
                      <CheckCircle2 size={12} /> Email terkirim
                    </span>
                  </div>

                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    autoFocus
                    className="w-full h-13 text-center text-2xl font-mono font-black tracking-[10px] rounded-xl border border-borderCol text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-surface/50"
                  />

                  {/* Dev / Simulator quick fill helper if in development */}
                  {devOtpHint && (
                    <div className="mt-2.5 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-center justify-between">
                      <span>Kode uji cepat: <strong>{devOtpHint}</strong></span>
                      <button
                        type="button"
                        onClick={() => setOtp(devOtpHint)}
                        className="px-2 py-0.5 rounded bg-amber-600 text-white font-bold text-[10px] cursor-pointer hover:bg-amber-700"
                      >
                        Isi Otomatis
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full h-12 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Verifikasi & Lanjut ke Data Penumpang</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>

                {/* Resend button */}
                <div className="text-center pt-2">
                  {resendCooldown > 0 ? (
                    <span className="text-xs text-muted">
                      Kirim ulang kode dalam <strong className="text-ink">{resendCooldown}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendOtp()}
                      className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw size={12} />
                      <span>Kirim ulang kode verifikasi</span>
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* Opsi Daftar Baru atau Masuk dengan Sandi */}
            <div className="pt-4 mt-2 text-center border-t border-borderCol">
              <p className="text-xs text-muted mb-2">
                Ingin daftar akun baru atau masuk dengan kata sandi?
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    openAuthModal({
                      mode: 'register',
                      title: 'Daftar Akun RuteKu',
                      description: 'Daftar akun cepat dalam 30 detik untuk langsung melanjutkan pemesanan kursi.',
                      onSuccess: () => {
                        router.push(targetPassengerUrl)
                      },
                    })
                  }
                  className="text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  Daftar Akun Baru
                </button>
                <span className="text-muted text-xs">·</span>
                <button
                  type="button"
                  onClick={() =>
                    openAuthModal({
                      mode: 'login',
                      title: 'Masuk Akun RuteKu',
                      description: 'Masuk dengan email atau nomor HP dan kata sandi Anda.',
                      onSuccess: () => {
                        router.push(targetPassengerUrl)
                      },
                    })
                  }
                  className="text-xs font-bold text-muted hover:text-ink cursor-pointer"
                >
                  Masuk dengan Sandi
                </button>
              </div>
            </div>
          </div>

          {/* Privacy Note */}
          <p className="mt-8 text-[11px] text-center text-muted leading-relaxed">
            Dengan melanjutkan, Anda menyetujui Ketentuan Layanan & Kebijakan Privasi RuteKu. Kursi Anda tetap aman selama timer berjalan.
          </p>
        </div>
      </main>

      {/* ── Modal Dialog Google OAuth ─────────────────────────────────── */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-borderCol space-y-5 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <GoogleIcon className="w-7 h-7 flex-shrink-0" />
              <div>
                <h3 className="text-base font-bold text-ink">Masuk dengan Google</h3>
                <p className="text-xs text-muted">Pilih atau masukkan akun Google Anda</p>
              </div>
            </div>

            <div className="space-y-3 border-y border-borderCol py-3">
              {/* Option: Masukkan Akun Google / Email Pengguna */}
              <div>
                <label className="block text-[11px] font-bold text-ink mb-1.5">
                  Masukkan Email Google Anda:
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={customGoogleEmail}
                    onChange={e => setCustomGoogleEmail(e.target.value)}
                    placeholder="nama.anda@gmail.com"
                    className="flex-1 h-10 px-3 rounded-xl border border-borderCol text-xs text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => handleGoogleAuth(customGoogleEmail)}
                    className="px-4 h-10 rounded-xl bg-primary text-white text-xs font-bold cursor-pointer hover:bg-primary-dark transition"
                  >
                    Masuk
                  </button>
                </div>
              </div>

              {/* Info Kredensial OAuth */}
              <div className="p-2.5 rounded-xl bg-surface border border-borderCol/60 text-[11px] text-muted leading-relaxed">
                <span className="font-semibold text-ink">Catatan:</span> Untuk login otomatis dengan 1-klik akun Google, masukkan <code className="text-primary font-mono font-bold">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> & <code className="text-primary font-mono font-bold">GOOGLE_CLIENT_SECRET</code> di file <code className="font-mono">.env</code>.
              </div>

              {/* Demo Account (Hanya untuk pengujian cepat pengembang) */}
              <div className="pt-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">Akun Demo Pengembang:</p>
                <button
                  type="button"
                  onClick={() => handleGoogleAuth('rifqidermawan15@gmail.com')}
                  className="w-full p-2.5 rounded-xl bg-surface hover:bg-primary-tint/40 border border-borderCol/60 hover:border-primary/40 flex items-center gap-2.5 text-left transition-all cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                    R
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-ink truncate">Rifqi Dermawan (Akun Demo)</div>
                    <div className="text-[11px] text-muted truncate">rifqidermawan15@gmail.com</div>
                  </div>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGoogleModal(false)}
              className="w-full py-2.5 rounded-xl border border-borderCol text-xs font-bold text-ink hover:bg-surface cursor-pointer"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
