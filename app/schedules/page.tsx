'use client'

import { use, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Stepper from '@/components/Stepper'
import { ArrowRight, SlidersHorizontal } from 'lucide-react'

/* ─── Mock Data ──────────────────────────────────────────────── */
const SCHEDULES = [
  {
    id: 'sch-001', dep: '05:30', arr: '09:00', dur: '3j30m',
    bus: 'Lintas Rasa', cls: 'Executive 2–2',
    fac: ['AC', 'Colokan', 'Bagasi 20 kg'],
    left: 14, price: 105000, highlighted: false,
  },
  {
    id: 'sch-002', dep: '08:00', arr: '11:30', dur: '3j30m',
    bus: 'Nusa Trans', cls: 'Executive 2–2',
    fac: ['AC', 'Colokan', 'Bagasi 20 kg'],
    left: 21, price: 125000, highlighted: true,
  },
  {
    id: 'sch-003', dep: '11:30', arr: '15:00', dur: '3j30m',
    bus: 'Cipta Wisata', cls: 'Executive 2–2',
    fac: ['AC', 'Colokan', 'Bagasi 20 kg'],
    left: 3, price: 125000, highlighted: false,
  },
  {
    id: 'sch-004', dep: '14:00', arr: '17:30', dur: '3j30m',
    bus: 'Nusa Trans', cls: 'Executive 2–2',
    fac: ['AC', 'Colokan'],
    left: 0, price: 125000, highlighted: false,
  },
  {
    id: 'sch-005', dep: '19:00', arr: '22:30', dur: '3j30m',
    bus: 'Lintas Rasa', cls: 'Sleeper 2–1',
    fac: ['AC', 'Colokan', 'Selimut'],
    left: 12, price: 165000, highlighted: false,
  },
]

const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

function seatBadge(left: number) {
  if (left === 0) return { label: '✕  Penuh', bg: 'bg-red-50 text-error border-red-200' }
  if (left <= 5)  return { label: `⚠ Hampir penuh · sisa ${left}`, bg: 'bg-amber-50 text-warning border-amber-200' }
  return { label: `Sisa ${left} kursi`, bg: 'bg-green-50 text-success border-green-200' }
}

/* ─── Page ───────────────────────────────────────────────────── */
function SchedulesContent({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; date?: string; passengers?: string }>
}) {
  const sp = use(searchParams)
  const from       = sp.from       ?? 'Jakarta'
  const to         = sp.to         ?? 'Bandung'
  const date       = sp.date       ?? '2026-10-10'
  const passengers = sp.passengers ?? '2'

  const router = useRouter()

  // Filter state
  const [fPagi,    setFPagi]    = useState(false)
  const [fSiang,   setFSiang]   = useState(false)
  const [fSore,    setFSore]    = useState(false)
  const [fExec,    setFExec]    = useState(false)
  const [fSleep,   setFSleep]   = useState(false)
  const [maxPrice, setMaxPrice] = useState(200000)
  const [sort,     setSort]     = useState('earliest')

  const fmtDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
    } catch { return d }
  }

  const filtered = SCHEDULES.filter(s => {
    const h = parseInt(s.dep)
    if (fPagi  && !(h >= 5  && h < 11)) return false
    if (fSiang && !(h >= 11 && h < 15)) return false
    if (fSore  && !(h >= 15))           return false
    if (fExec  && !s.cls.includes('Executive')) return false
    if (fSleep && !s.cls.includes('Sleeper'))   return false
    if (s.price > maxPrice) return false
    return true
  }).sort((a, b) => {
    if (sort === 'cheapest') return a.price - b.price
    if (sort === 'seats')    return b.left - a.left
    return a.dep.localeCompare(b.dep)
  })

  const resetFilter = () => {
    setFPagi(false); setFSiang(false); setFSore(false)
    setFExec(false); setFSleep(false); setMaxPrice(200000)
  }

  return (
    <div className="min-h-screen bg-surface pb-12">
      <Stepper currentStep={1} />

      {/* ── Route header ─────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-5 flex items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-ink flex items-center gap-2 flex-wrap">
            {from} <ArrowRight size={18} className="text-muted flex-shrink-0" /> {to}
          </h1>
          <p className="text-sm text-muted mt-0.5">
            {fmtDate(date)} · {passengers} penumpang
          </p>
        </div>
        <button
          onClick={() => router.push('/')}
          className="flex-shrink-0 px-4 py-2 text-sm font-semibold border border-borderCol rounded-full text-ink hover:border-primary hover:text-primary transition-all"
        >
          Ubah pencarian
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 flex gap-5 items-start">
        {/* ── Filter sidebar ───────────────────────────────── */}
        <aside className="hidden md:block w-52 flex-shrink-0 bg-white border border-borderCol rounded-card p-4 sticky top-20">
          <h2 className="font-bold text-ink mb-4 flex items-center gap-2 text-sm">
            <SlidersHorizontal size={14} /> Filter
          </h2>

          <FilterGroup label="Jam berangkat">
            {[
              ['Pagi (05:00–11:00)',       fPagi,  setFPagi],
              ['Siang (11:00–15:00)',      fSiang, setFSiang],
              ['Sore & malam (15:00–24:00)', fSore, setFSore],
            ].map(([label, val, set]: any) => (
              <CheckItem key={label} label={label} checked={val} onChange={set} />
            ))}
          </FilterGroup>

          <FilterGroup label="Kelas bus">
            {[
              ['Executive (2–2)', fExec,  setFExec],
              ['Sleeper (2–1)',   fSleep, setFSleep],
            ].map(([label, val, set]: any) => (
              <CheckItem key={label} label={label} checked={val} onChange={set} />
            ))}
          </FilterGroup>

          <FilterGroup label="Harga maksimum">
            <input
              type="range" min={80000} max={200000} step={5000}
              value={maxPrice} onChange={e => setMaxPrice(+e.target.value)}
              className="w-full accent-primary"
            />
            <p className="text-xs text-muted mt-1">Rp 80.000 – {fmt(maxPrice)}</p>
          </FilterGroup>

          <button onClick={resetFilter} className="text-xs font-semibold text-primary hover:underline mt-1">
            Reset filter
          </button>
        </aside>

        {/* ── Schedule list ────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p className="text-sm font-medium text-muted">
              {filtered.length} jadwal ditemukan
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted">Urutkan</span>
              <select
                value={sort} onChange={e => setSort(e.target.value)}
                className="text-sm border border-borderCol rounded-input px-3 h-9 bg-white outline-none focus:border-primary"
              >
                <option value="earliest">Berangkat paling awal</option>
                <option value="cheapest">Harga termurah</option>
                <option value="seats">Kursi terbanyak</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {filtered.map(s => {
              const badge  = seatBadge(s.left)
              const isFull = s.left === 0
              return (
                <div
                  key={s.id}
                  className={`bg-white border rounded-card p-4 sm:p-5 transition-all
                    ${s.highlighted
                      ? 'border-primary shadow-sm ring-1 ring-primary/20'
                      : 'border-borderCol hover:border-primary/40 hover:shadow-sm'}
                    ${isFull ? 'opacity-60' : ''}
                  `}
                >
                  {s.highlighted && (
                    <p className="text-xs font-semibold text-primary mb-2">✦ Dipilih di pencarian terakhir</p>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
                    {/* Time block */}
                    <div className="flex-shrink-0">
                      <span className="text-2xl font-extrabold text-ink">{s.dep}</span>
                      <span className="text-sm text-muted"> → {s.arr} · {s.dur}</span>
                    </div>

                    {/* Bus info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-ink text-sm">{s.bus} · {s.cls}</p>
                      <p className="text-xs text-muted mt-0.5">{s.fac.join(' · ')}</p>
                      {isFull && <p className="text-xs text-muted mt-1">Semua kursi terisi atau ditahan</p>}
                    </div>

                    {/* Right section */}
                    <div className="flex sm:flex-col items-center sm:items-end gap-3 flex-wrap sm:flex-nowrap flex-shrink-0">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${badge.bg}`}>
                        {badge.label}
                      </span>
                      {!isFull && (
                        <div className="text-right sm:mt-auto">
                          <p className="text-lg font-extrabold text-ink leading-none">{fmt(s.price)}</p>
                          <p className="text-xs text-muted">per kursi</p>
                        </div>
                      )}
                      {isFull ? (
                        <div className="flex gap-2 items-center">
                          <button disabled className="px-4 py-2 text-sm font-semibold border border-borderCol text-muted rounded-input cursor-not-allowed">
                            Penuh
                          </button>
                          <button className="text-sm font-semibold text-primary hover:underline">
                            Lihat jadwal lain
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => router.push(`/booking/${s.id}/seat?from=${from}&to=${to}&date=${date}&passengers=${passengers}`)}
                          className="px-5 py-2 bg-primary hover:bg-primary-dark text-white font-bold text-sm rounded-input transition-colors"
                        >
                          Pilih
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SchedulesPage(props: {
  searchParams: Promise<{ from?: string; to?: string; date?: string; passengers?: string }>
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface p-8 text-center text-muted">Memuat jadwal bus...</div>}>
      <SchedulesContent {...props} />
    </Suspense>
  )
}

/* ─── Helpers ────────────────────────────────────────────────── */
function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2">{label}</p>
      {children}
    </div>
  )
}

function CheckItem({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-2 text-sm text-ink mb-2 cursor-pointer leading-snug">
      <input
        type="checkbox" checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="mt-0.5 accent-primary"
      />
      {label}
    </label>
  )
}
