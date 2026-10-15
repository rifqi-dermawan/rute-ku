'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search, ArrowLeftRight, Clock, RotateCcw } from 'lucide-react'

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

  const [from, setFrom] = useState(searchParams.get('from') || 'Jakarta')
  const [to, setTo] = useState(searchParams.get('to') || 'Bandung')
  const [date, setDate] = useState(searchParams.get('date') || '2026-10-10')
  const [passengers, setPassengers] = useState(
    searchParams.get('passengers') ? Number(searchParams.get('passengers')) : 2
  )

  useEffect(() => {
    const qFrom = searchParams.get('from')
    const qTo = searchParams.get('to')
    const qDate = searchParams.get('date')
    const qPassengers = searchParams.get('passengers')

    if (qFrom) setFrom(qFrom)
    if (qTo) setTo(qTo)
    if (qDate) setDate(qDate)
    if (qPassengers) setPassengers(Number(qPassengers))
  }, [searchParams])

  const handleSwap = () => {
    setFrom(to)
    setTo(from)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(
      `/schedules?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${date}&passengers=${passengers}`
    )
  }

  return (
    <div className="min-h-screen bg-surface pb-20">
      {/* ── Hero Section ─────────────────────────────────────────────── */}
      <section className="relative bg-secondary px-6 sm:px-12 pt-14 pb-24 overflow-hidden text-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8 relative z-10">
          <div className="max-w-xl">
            <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-black leading-tight tracking-tight">
              Pesan kursi bus antarkota.<br />
              Kursimu aman, tanpa rebutan.
            </h1>
            <p className="mt-4 text-borderCol text-sm sm:text-base leading-relaxed max-w-lg">
              Pilih kursi sendiri di denah, kami tahan 10 menit untukmu, lalu bayar dengan tenang.
            </p>
          </div>

          {/* Bus Illustration (matches design screenshot) */}
          <div className="hidden md:flex items-center justify-center relative w-72 h-36">
            <svg width="280" height="130" viewBox="0 0 280 130" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Dotted path */}
              <path
                d="M10 100 C 60 90, 80 50, 140 50 C 190 50, 210 10, 260 20"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="2.5"
                strokeDasharray="6 6"
              />
              {/* Waypoint circles */}
              <circle cx="10" cy="100" r="6" fill="#12385C" stroke="white" strokeWidth="3" />
              <circle cx="260" cy="20" r="6" fill="#12385C" stroke="white" strokeWidth="3" />

              {/* Friendly Bus Card */}
              <g transform="translate(95, 20)">
                <rect x="0" y="0" width="76" height="52" rx="14" fill="#0B6E78" />
                {/* Windshield */}
                <rect x="8" y="7" width="60" height="22" rx="6" fill="#E3F2F3" />
                {/* Bus Eyes */}
                <circle cx="28" cy="18" r="3.5" fill="#084F57" />
                <circle cx="48" cy="18" r="3.5" fill="#084F57" />
                {/* Headlights */}
                <circle cx="14" cy="38" r="4" fill="#FDE047" />
                <circle cx="62" cy="38" r="4" fill="#FDE047" />
                {/* Bumper line */}
                <rect x="25" y="37" width="26" height="3" rx="1.5" fill="rgba(255,255,255,0.4)" />
                {/* Wheels */}
                <rect x="12" y="50" width="12" height="6" rx="2" fill="#0F2A33" />
                <rect x="52" y="50" width="12" height="6" rx="2" fill="#0F2A33" />
              </g>
            </svg>
          </div>
        </div>
      </section>

      {/* ── Search Form Card ────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 -mt-12 relative z-20">
        <form
          onSubmit={handleSearch}
          className="bg-white rounded-card shadow-lg border border-borderCol p-6 sm:p-7"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            {/* Asal */}
            <div>
              <label className="block text-xs font-bold text-ink mb-2">Asal</label>
              <select
                value={from}
                onChange={e => setFrom(e.target.value)}
                className="w-full h-12 px-3.5 border border-borderCol rounded-input bg-white text-ink font-semibold text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                {CITIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Tujuan */}
            <div>
              <label className="block text-xs font-bold text-ink mb-2">Tujuan</label>
              <select
                value={to}
                onChange={e => setTo(e.target.value)}
                className="w-full h-12 px-3.5 border border-borderCol rounded-input bg-white text-ink font-semibold text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                {CITIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Tanggal berangkat */}
            <div>
              <label className="block text-xs font-bold text-ink mb-2">Tanggal berangkat</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full h-12 px-3.5 border border-borderCol rounded-input bg-white text-ink font-semibold text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer"
              >
              </input>
            </div>

            {/* Penumpang */}
            <div>
              <label className="block text-xs font-bold text-ink mb-2">Penumpang</label>
              <div className="flex items-center justify-between h-12 px-3 border border-borderCol rounded-input bg-white">
                <button
                  type="button"
                  onClick={() => setPassengers(p => Math.max(1, p - 1))}
                  className="w-8 h-8 flex items-center justify-center text-lg font-bold text-muted hover:text-primary hover:bg-surface rounded transition-colors"
                >
                  −
                </button>
                <span className="text-sm font-bold text-ink">{passengers} orang</span>
                <button
                  type="button"
                  onClick={() => setPassengers(p => Math.min(4, p + 1))}
                  className="w-8 h-8 flex items-center justify-center text-lg font-bold text-muted hover:text-primary hover:bg-surface rounded transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Bar: Swap link & Cari jadwal button */}
          <div className="mt-5 pt-4 border-t border-borderCol/60 flex items-center justify-between flex-wrap gap-4">
            <button
              type="button"
              onClick={handleSwap}
              className="text-xs font-bold text-primary flex items-center gap-1.5 hover:underline transition-colors"
            >
              <ArrowLeftRight size={14} />
              <span>Tukar asal &amp; tujuan</span>
            </button>

            <button
              type="submit"
              className="h-11 px-7 bg-primary hover:bg-primary-dark text-white font-bold rounded-input flex items-center gap-2 text-sm shadow-sm transition-all"
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
            href="/schedules?from=Jakarta&to=Bandung&passengers=2"
            className="flex items-center gap-2 px-4 py-2 border border-borderCol bg-white rounded-full text-xs sm:text-sm font-medium text-ink hover:border-primary hover:text-primary transition-all shadow-2xs"
          >
            <Clock size={14} className="text-muted" />
            <span>Jakarta → Bandung · Sab, 10 Okt · 2 orang</span>
          </Link>

          <Link
            href="/schedules?from=Surabaya&to=Yogyakarta&passengers=1"
            className="flex items-center gap-2 px-4 py-2 border border-borderCol bg-white rounded-full text-xs sm:text-sm font-medium text-ink hover:border-primary hover:text-primary transition-all shadow-2xs"
          >
            <Clock size={14} className="text-muted" />
            <span>Surabaya → Yogyakarta · 1 orang</span>
          </Link>

          <Link
            href="/schedules?from=Jakarta&to=Bandung&passengers=1"
            className="flex items-center gap-2 px-4 py-2 border border-primary/40 bg-primary-tint rounded-full text-xs sm:text-sm font-bold text-primary hover:border-primary transition-all shadow-2xs"
          >
            <RotateCcw size={14} />
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
              href={`/schedules?from=${route.from}&to=${route.to}&passengers=2`}
              className="bg-white border border-borderCol rounded-card p-5 hover:border-primary hover:shadow-md transition-all group block"
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