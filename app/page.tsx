'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search, ArrowLeftRight, Clock, RotateCcw, AlertCircle } from 'lucide-react'

const CITIES = ['Jakarta', 'Bandung', 'Yogyakarta', 'Surabaya', 'Malang', 'Semarang', 'Solo', 'Denpasar']

const POPULAR_ROUTES = [
  { from: 'Jakarta', to: 'Bandung', duration: '3 jam 30 menit', schedules: 8, minPrice: 95000 },
  { from: 'Bandung', to: 'Yogyakarta', duration: '9 jam', schedules: 3, minPrice: 180000 },
  { from: 'Surabaya', to: 'Malang', duration: '2 jam 30 menit', schedules: 10, minPrice: 70000 },
]

const HOW_STEPS = [
  { n: 1, bold: 'Pilih di denah.', rest: 'Status kursi diperbarui otomatis, jadi yang kamu lihat selalu terbaru.' },
  { n: 2, bold: 'Kursi ditahan 10 menit.', rest: 'Orang lain tidak bisa mengambilnya selama timer berjalan.' },
  { n: 3, bold: 'Bayar, e-tiket langsung terbit.', rest: 'Kursi jadi milikmu begitu pembayaran berhasil.' },
]

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Form states start empty by default so the user must select them
  const [from, setFrom] = useState(searchParams.get('from') || '')
  const [to, setTo] = useState(searchParams.get('to') || '')
  const [date, setDate] = useState(searchParams.get('date') || '')
  const [passengers, setPassengers] = useState(searchParams.get('passengers') || '')

  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const qFrom = searchParams.get('from')
    const qTo = searchParams.get('to')
    const qDate = searchParams.get('date')
    const qPassengers = searchParams.get('passengers')

    if (qFrom) setFrom(qFrom)
    if (qTo) setTo(qTo)
    if (qDate) setDate(qDate)
    if (qPassengers) setPassengers(qPassengers)
  }, [searchParams])

  const runValidation = (
    curFrom = from,
    curTo = to,
    curDate = date,
    curPassengers = passengers
  ): Record<string, string> => {
    const errs: Record<string, string> = {}

    if (!curFrom.trim()) {
      errs['from'] = 'Kota asal wajib diisi terlebih dahulu'
    }

    if (!curTo.trim()) {
      errs['to'] = 'Kota tujuan wajib diisi terlebih dahulu'
    } else if (curFrom && curTo && curFrom === curTo) {
      errs['to'] = 'Kota tujuan tidak boleh sama dengan kota asal'
    }

    if (!curDate.trim()) {
      errs['date'] = 'Tanggal berangkat wajib diisi terlebih dahulu'
    }

    if (!curPassengers || String(curPassengers).trim() === '') {
      errs['passengers'] = 'Jumlah penumpang wajib diisi terlebih dahulu'
    }

    return errs
  }

  const handleFromChange = (val: string) => {
    setFrom(val)
    if (hasAttemptedSubmit) {
      setErrors(runValidation(val, to, date, passengers))
    }
  }

  const handleToChange = (val: string) => {
    setTo(val)
    if (hasAttemptedSubmit) {
      setErrors(runValidation(from, val, date, passengers))
    }
  }

  const handleDateChange = (val: string) => {
    setDate(val)
    if (hasAttemptedSubmit) {
      setErrors(runValidation(from, to, val, passengers))
    }
  }

  const handlePassengersChange = (val: string) => {
    setPassengers(val)
    if (hasAttemptedSubmit) {
      setErrors(runValidation(from, to, date, val))
    }
  }

  const handleSwap = () => {
    if (!from && !to) return
    const newFrom = to
    const newTo = from
    setFrom(newFrom)
    setTo(newTo)
    if (hasAttemptedSubmit) {
      setErrors(runValidation(newFrom, newTo, date, passengers))
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setHasAttemptedSubmit(true)

    const errs = runValidation(from, to, date, passengers)
    setErrors(errs)

    if (Object.keys(errs).length > 0) {
      const banner = document.getElementById('search-validation-banner')
      if (banner) {
        banner.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return // BLOCKS NAVIGATION
    }

    router.push(
      `/schedules?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${encodeURIComponent(date)}&passengers=${encodeURIComponent(passengers)}`
    )
  }

  return (
    <div className="min-h-screen bg-surface pb-20">
      {/* ── Hero Section ─────────────────────────────────────────────── */}
      <section className="relative bg-secondary px-4 sm:px-12 pt-10 sm:pt-14 pb-20 sm:pb-24 overflow-hidden text-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6 sm:gap-8 relative z-10">
          <div className="max-w-xl">
            <h1 className="text-2xl sm:text-4xl lg:text-[44px] font-black leading-tight tracking-tight text-white">
              Pesan kursi bus antarkota.<br />
              Kursimu aman, tanpa rebutan.
            </h1>
            <p className="mt-3 sm:mt-4 text-borderCol text-xs sm:text-base leading-relaxed max-w-lg">
              Pilih kursi sendiri di denah, kami tahan 10 menit untukmu, lalu bayar dengan tenang.
            </p>
          </div>

          {/* Bus Illustration */}
          <div className="hidden md:flex items-center justify-center relative w-72 h-36">
            <svg width="280" height="130" viewBox="0 0 280 130" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M10 100 C 60 90, 80 50, 140 50 C 190 50, 210 10, 260 20"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="2.5"
                strokeDasharray="6 6"
              />
              <circle cx="10" cy="100" r="6" fill="#12385C" stroke="white" strokeWidth="3" />
              <circle cx="260" cy="20" r="6" fill="#12385C" stroke="white" strokeWidth="3" />

              <g transform="translate(95, 20)">
                <rect x="0" y="0" width="76" height="52" rx="14" fill="#0B6E78" />
                <rect x="8" y="7" width="60" height="22" rx="6" fill="#E3F2F3" />
                <circle cx="28" cy="18" r="3.5" fill="#084F57" />
                <circle cx="48" cy="18" r="3.5" fill="#084F57" />
                <circle cx="14" cy="38" r="4" fill="#FDE047" />
                <circle cx="62" cy="38" r="4" fill="#FDE047" />
                <rect x="25" y="37" width="26" height="3" rx="1.5" fill="rgba(255,255,255,0.4)" />
                <rect x="12" y="50" width="12" height="6" rx="2" fill="#0F2A33" />
                <rect x="52" y="50" width="12" height="6" rx="2" fill="#0F2A33" />
              </g>
            </svg>
          </div>
        </div>
      </section>

      {/* ── Search Form Card ────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-3.5 sm:px-8 -mt-10 sm:-mt-12 relative z-20">
        <form
          onSubmit={handleSearch}
          className="bg-white rounded-card shadow-lg border border-borderCol p-4 sm:p-7"
        >
          {/* Validation Warning Banner */}
          {hasAttemptedSubmit && Object.keys(errors).length > 0 && (
            <div
              id="search-validation-banner"
              className="mb-5 p-4 rounded-xl bg-red-50 border-2 border-red-300 text-red-900 shadow-2xs animate-in fade-in slide-in-from-top-1 duration-200"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-sm text-red-950">
                    Wajib Diisi Terlebih Dahulu ({Object.keys(errors).length} data belum lengkap)
                  </p>
                  <p className="text-red-800 leading-relaxed">
                    Kota asal, kota tujuan, tanggal berangkat, dan jumlah penumpang wajib diisi terlebih dahulu sebelum mencari jadwal bus.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            {/* Asal */}
            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">
                Asal <span className="text-error">*</span>
              </label>
              <select
                value={from}
                onChange={e => handleFromChange(e.target.value)}
                className={`w-full h-12 px-3.5 border rounded-input bg-white text-ink font-semibold text-sm outline-none transition-all cursor-pointer ${
                  errors['from']
                    ? 'border-error bg-red-50/20 ring-1 ring-error focus:ring-error'
                    : 'border-borderCol focus:border-primary focus:ring-1 focus:ring-primary'
                }`}
              >
                <option value="">Pilih kota asal</option>
                {CITIES.map(c => (
                  <option key={c} value={c} disabled={c === to}>
                    {c}
                  </option>
                ))}
              </select>
              {errors['from'] && (
                <p className="mt-1 text-xs text-error font-medium flex items-center gap-1">
                  <AlertCircle size={13} className="flex-shrink-0" />
                  <span>{errors['from']}</span>
                </p>
              )}
            </div>

            {/* Tujuan */}
            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">
                Tujuan <span className="text-error">*</span>
              </label>
              <select
                value={to}
                onChange={e => handleToChange(e.target.value)}
                className={`w-full h-12 px-3.5 border rounded-input bg-white text-ink font-semibold text-sm outline-none transition-all cursor-pointer ${
                  errors['to']
                    ? 'border-error bg-red-50/20 ring-1 ring-error focus:ring-error'
                    : 'border-borderCol focus:border-primary focus:ring-1 focus:ring-primary'
                }`}
              >
                <option value="">Pilih kota tujuan</option>
                {CITIES.map(c => (
                  <option key={c} value={c} disabled={c === from}>
                    {c}
                  </option>
                ))}
              </select>
              {errors['to'] && (
                <p className="mt-1 text-xs text-error font-medium flex items-center gap-1">
                  <AlertCircle size={13} className="flex-shrink-0" />
                  <span>{errors['to']}</span>
                </p>
              )}
            </div>

            {/* Tanggal berangkat */}
            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">
                Tanggal berangkat <span className="text-error">*</span>
              </label>
              <input
                type="date"
                value={date}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => handleDateChange(e.target.value)}
                className={`w-full h-12 px-3.5 border rounded-input bg-white text-ink font-semibold text-sm outline-none transition-all cursor-pointer ${
                  errors['date']
                    ? 'border-error bg-red-50/20 ring-1 ring-error focus:ring-error'
                    : 'border-borderCol focus:border-primary focus:ring-1 focus:ring-primary'
                }`}
              />
              {errors['date'] && (
                <p className="mt-1 text-xs text-error font-medium flex items-center gap-1">
                  <AlertCircle size={13} className="flex-shrink-0" />
                  <span>{errors['date']}</span>
                </p>
              )}
            </div>

            {/* Penumpang */}
            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">
                Penumpang <span className="text-error">*</span>
              </label>
              <select
                value={passengers}
                onChange={e => handlePassengersChange(e.target.value)}
                className={`w-full h-12 px-3.5 border rounded-input bg-white text-ink font-semibold text-sm outline-none transition-all cursor-pointer ${
                  errors['passengers']
                    ? 'border-error bg-red-50/20 ring-1 ring-error focus:ring-error'
                    : 'border-borderCol focus:border-primary focus:ring-1 focus:ring-primary'
                }`}
              >
                <option value="">Pilih jumlah penumpang</option>
                <option value="1">1 orang</option>
                <option value="2">2 orang</option>
                <option value="3">3 orang</option>
                <option value="4">4 orang</option>
              </select>
              {errors['passengers'] && (
                <p className="mt-1 text-xs text-error font-medium flex items-center gap-1">
                  <AlertCircle size={13} className="flex-shrink-0" />
                  <span>{errors['passengers']}</span>
                </p>
              )}
            </div>
          </div>

          {/* Bottom Bar: Swap link & Cari jadwal button */}
          <div className="mt-5 pt-4 border-t border-borderCol/60 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <button
              type="button"
              onClick={handleSwap}
              className="text-xs font-bold text-primary flex items-center gap-1.5 hover:underline transition-colors cursor-pointer self-start sm:self-auto py-1"
            >
              <ArrowLeftRight size={14} />
              <span>Tukar asal &amp; tujuan</span>
            </button>

            <button
              type="submit"
              className="w-full sm:w-auto h-12 sm:h-11 px-7 bg-primary hover:bg-primary-dark text-white font-bold rounded-input flex items-center justify-center gap-2 text-sm shadow-sm transition-all cursor-pointer"
            >
              <Search size={16} />
              <span>Cari jadwal</span>
            </button>
          </div>
        </form>
      </section>

      {/* ── Lanjutkan Cepat ─────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 mt-8">
        <h2 className="text-sm font-bold text-ink mb-3">Lanjutkan cepat</h2>
        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/schedules?from=Jakarta&to=Bandung&date=2026-10-10&passengers=2"
            className="group flex items-center gap-2 px-4 py-2 border border-borderCol bg-white rounded-full text-xs sm:text-sm font-medium text-ink hover:bg-primary-tint hover:border-primary hover:text-primary transition-all shadow-2xs cursor-pointer"
          >
            <Clock size={14} className="text-muted group-hover:text-primary transition-colors" />
            <span>Jakarta → Bandung · Sab, 10 Okt · 2 orang</span>
          </Link>

          <Link
            href="/schedules?from=Surabaya&to=Yogyakarta&date=2026-10-10&passengers=1"
            className="group flex items-center gap-2 px-4 py-2 border border-borderCol bg-white rounded-full text-xs sm:text-sm font-medium text-ink hover:bg-primary-tint hover:border-primary hover:text-primary transition-all shadow-2xs cursor-pointer"
          >
            <Clock size={14} className="text-muted group-hover:text-primary transition-colors" />
            <span>Surabaya → Yogyakarta · 1 orang</span>
          </Link>

          <Link
            href="/schedules?from=Jakarta&to=Bandung&date=2026-10-08&passengers=1"
            className="group flex items-center gap-2 px-4 py-2 border border-borderCol bg-white rounded-full text-xs sm:text-sm font-medium text-ink hover:bg-primary-tint hover:border-primary hover:text-primary transition-all shadow-2xs cursor-pointer"
          >
            <RotateCcw size={14} className="text-muted group-hover:text-primary transition-colors" />
            <span>Pesan lagi: Jakarta → Bandung (8 Okt)</span>
          </Link>
        </div>
      </section>

      {/* ── Rute Populer ────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 mt-9">
        <h2 className="text-base sm:text-lg font-bold text-ink mb-3.5">Rute populer</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {POPULAR_ROUTES.map(route => (
            <Link
              key={`${route.from}-${route.to}`}
              href={`/schedules?from=${route.from}&to=${route.to}&date=2026-10-10&passengers=2`}
              className="bg-white border border-borderCol rounded-card p-5 hover:border-primary hover:shadow-md transition-all group block cursor-pointer"
            >
              <h3 className="text-base font-bold text-ink group-hover:text-primary transition-colors">
                {route.from} → {route.to}
              </h3>
              <p className="text-xs text-muted mt-1">
                ± {route.duration} · {route.schedules} jadwal per hari
              </p>
              <p className="text-sm font-extrabold text-primary mt-3">
                Mulai Rp {route.minPrice.toLocaleString('id-ID')}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Bagaimana Kursimu Diamankan ─────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 mt-9">
        <div className="bg-white border border-borderCol rounded-card p-6 sm:p-7">
          <h2 className="text-base font-bold text-ink mb-4">Bagaimana kursimu diamankan</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW_STEPS.map(step => (
              <div key={step.n} className="flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-full bg-primary-tint border border-primary/30 text-primary font-bold text-sm flex items-center justify-center flex-shrink-0">
                  {step.n}
                </div>
                <p className="text-xs sm:text-sm text-ink leading-relaxed">
                  <strong className="font-bold text-ink">{step.bold}</strong>{' '}
                  <span className="text-muted">{step.rest}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface" />}>
      <HomeContent />
    </Suspense>
  )
}