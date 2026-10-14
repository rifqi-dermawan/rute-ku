'use client'

import { use, useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Stepper from '@/components/Stepper'
import { Check, Clock, Ban } from 'lucide-react'

/* ─── Types ──────────────────────────────────────────────────── */
type SeatStatus = 'available' | 'selected' | 'held' | 'booked' | 'blocked'

/* ─── Initial seat map (Executive 2-2, 10 rows) ─────────────── */
const INITIAL_MAP: Record<string, SeatStatus> = {
  '1A': 'booked',  '1B': 'booked',  '1C': 'available', '1D': 'available',
  '2A': 'available','2B': 'held',   '2C': 'available', '2D': 'available',
  '3A': 'booked',  '3B': 'available','3C': 'available', '3D': 'blocked',
  '4A': 'held',    '4B': 'held',    '4C': 'available', '4D': 'booked',
  '5A': 'available','5B': 'available','5C': 'booked',  '5D': 'available',
  '6A': 'available','6B': 'available','6C': 'available','6D': 'held',
  '7A': 'available','7B': 'booked',  '7C': 'booked',   '7D': 'available',
  '8A': 'booked',  '8B': 'available','8C': 'available', '8D': 'available',
  '9A': 'held',    '9B': 'available','9C': 'available', '9D': 'booked',
  '10A': 'booked', '10B': 'booked', '10C': 'blocked',  '10D': 'blocked',
}

const ROWS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const COLS: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D']

const SCHEDULE_INFO = {
  from: 'Jakarta',
  to: 'Bandung',
  date: 'Sab, 10 Okt 2026',
  dep: '08:00',
  arr: '11:30',
  bus: 'Nusa Trans',
  cls: 'Executive 2–2',
  price: 125000,
}

/* ─── Seat button styles ─────────────────────────────────────── */
function seatClass(status: SeatStatus, isSelected: boolean): string {
  if (isSelected) {
    return 'bg-[#4F46E5] border-[#4338CA] text-white shadow-sm ring-2 ring-[#4F46E5]/30 cursor-pointer scale-102'
  }
  switch (status) {
    case 'available':
      return 'bg-white border-borderCol text-ink hover:border-primary hover:bg-primary-tint/40 cursor-pointer transition-all'
    case 'held':
      return 'bg-pink-100 border-pink-300 text-pink-600 cursor-not-allowed'
    case 'booked':
      return 'bg-[#0F2A33] border-[#0F2A33] text-white cursor-not-allowed'
    case 'blocked':
      return 'bg-slate-100 border-dashed border-borderCol text-slate-400 cursor-not-allowed'
    default:
      return 'bg-white border-borderCol'
  }
}

function SeatIcon({ status, isSelected }: { status: SeatStatus; isSelected: boolean }) {
  if (isSelected) return <Check size={11} strokeWidth={3} className="text-white" />
  if (status === 'held') return <Clock size={11} className="text-pink-600" />
  if (status === 'booked') return <span className="text-[9px] font-black leading-none">✕</span>
  if (status === 'blocked') return <Ban size={10} className="text-slate-400" />
  return null
}

/* ─── Page ───────────────────────────────────────────────────── */
function SeatContent({
  params,
  searchParams,
}: {
  params: Promise<{ scheduleId: string }>
  searchParams: Promise<{ passengers?: string; from?: string; to?: string; date?: string }>
}) {
  const { scheduleId } = use(params)
  const sp = use(searchParams)
  const maxSelect = parseInt(sp.passengers ?? '2')
  const from = sp.from ?? SCHEDULE_INFO.from
  const to = sp.to ?? SCHEDULE_INFO.to

  const router = useRouter()

  /* Seat state - default 5A and 5B preselected to match mockup */
  const [seatMap, setSeatMap] = useState<Record<string, SeatStatus>>({ ...INITIAL_MAP })
  const [selected, setSelected] = useState<string[]>(['5A', '5B'])

  /* Timer: 08:37 */
  const [timeLeft, setTimeLeft] = useState(517)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(t)
          setExpired(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [])

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  /* Toggle seat */
  const toggleSeat = useCallback(
    (seatId: string) => {
      const status = seatMap[seatId]
      if (status !== 'available' && !selected.includes(seatId)) return

      setSelected(prev => {
        if (prev.includes(seatId)) {
          return prev.filter(s => s !== seatId)
        }
        if (prev.length >= maxSelect) {
          // Replace the oldest selection
          return [...prev.slice(1), seatId]
        }
        return [...prev, seatId]
      })
    },
    [seatMap, selected, maxSelect]
  )

  /* Auto-select best available */
  const autoSelect = () => {
    const avail = Object.entries(seatMap)
      .filter(([, s]) => s === 'available')
      .map(([id]) => id)
      .slice(0, maxSelect)
    setSelected(avail)
  }

  /* Demo controls */
  const simulateTaken = () => {
    if (selected.length === 0) return
    const tgt = selected[0]
    setSeatMap(prev => ({ ...prev, [tgt]: 'held' }))
    setSelected(prev => prev.filter(s => s !== tgt))
  }

  const resetDemo = () => {
    setSeatMap({ ...INITIAL_MAP })
    setSelected(['5A', '5B'])
    setTimeLeft(517)
    setExpired(false)
  }

  const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

  /* Legend counts */
  const counts = {
    available: 19,
    selected: selected.length,
    held: 5,
    booked: 11,
    blocked: 3,
  }

  return (
    <div className="min-h-screen bg-surface pb-16">
      <Stepper currentStep={2} />

      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-5 flex items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-ink">Pilih kursi</h1>
          <p className="text-xs sm:text-sm text-muted mt-0.5">
            {from} → {to} · {SCHEDULE_INFO.date} · {SCHEDULE_INFO.dep} · {SCHEDULE_INFO.bus} {SCHEDULE_INFO.cls} · {maxSelect} penumpang
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="flex-shrink-0 px-4 py-2 text-xs sm:text-sm font-bold border border-primary text-primary hover:bg-primary-tint/30 rounded-input transition-all"
        >
          Ganti jadwal
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 flex flex-col lg:flex-row gap-6 items-start">
        {/* ── Seat Map Area (Left) ─────────────────────────────────── */}
        <div className="flex-1 w-full min-w-0">
          {/* Banner: Auto-refresh & quick tools */}
          <div className="bg-white border border-borderCol rounded-card p-3.5 mb-4 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-ink">
              <span className="w-2.5 h-2.5 rounded-full bg-success inline-block animate-pulse" />
              <span>Denah diperbarui otomatis tiap 5 detik</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={autoSelect}
                className="text-xs font-bold text-primary border border-primary rounded-full px-3 py-1 hover:bg-primary-tint transition-colors flex items-center gap-1"
              >
                ✦ Pilih kursi otomatis (terbaik)
              </button>
              <button type="button" className="text-xs text-muted hover:text-primary transition-colors">
                Pintasan keyboard (?)
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* Bus Grid Layout */}
            <div className="bg-white border border-borderCol rounded-2xl p-5 sm:p-6 flex-shrink-0 w-full sm:w-[280px] shadow-2xs">
              {/* Bus Front */}
              <div className="flex items-center justify-between text-[11px] font-bold text-muted mb-4 pb-2 border-b border-borderCol">
                <span className="flex items-center gap-1.5 text-ink">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="m4.93 4.93 4.24 4.24" />
                    <path d="m14.83 9.17 4.24-4.24" />
                    <path d="M12 12v9" />
                  </svg>
                  SOPIR
                </span>
                <span className="text-[10px] uppercase tracking-wider text-muted font-bold">DEPAN</span>
              </div>

              {/* Column Labels */}
              <div className="grid grid-cols-[1.5rem_2.2rem_2.2rem_0.8rem_2.2rem_2.2rem] gap-1 mb-2 text-center">
                <div />
                {COLS.slice(0, 2).map(c => (
                  <div key={c} className="text-[11px] font-bold text-muted">{c}</div>
                ))}
                <div />
                {COLS.slice(2).map(c => (
                  <div key={c} className="text-[11px] font-bold text-muted">{c}</div>
                ))}
              </div>

              {/* Rows 1..10 */}
              {ROWS.map(row => (
                <div key={row} className="grid grid-cols-[1.5rem_2.2rem_2.2rem_0.8rem_2.2rem_2.2rem] gap-1 mb-2 items-center">
                  <div className="text-[11px] text-muted text-center font-bold">{row}</div>

                  {/* Seats A, B */}
                  {(['A', 'B'] as const).map(col => {
                    const id = `${row}${col}`
                    const st = seatMap[id]
                    const sel = selected.includes(id)
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleSeat(id)}
                        className={`w-9 h-9 rounded-xl border text-xs font-bold flex items-center justify-center flex-col transition-all ${seatClass(
                          st,
                          sel
                        )}`}
                        title={`Kursi ${id}`}
                      >
                        <SeatIcon status={st} isSelected={sel} />
                        <span className="text-[9px] leading-none mt-0.5 font-mono">{id}</span>
                      </button>
                    )
                  })}

                  {/* Aisle */}
                  <div className="w-2" />

                  {/* Seats C, D */}
                  {(['C', 'D'] as const).map(col => {
                    const id = `${row}${col}`
                    const st = seatMap[id]
                    const sel = selected.includes(id)
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleSeat(id)}
                        className={`w-9 h-9 rounded-xl border text-xs font-bold flex items-center justify-center flex-col transition-all ${seatClass(
                          st,
                          sel
                        )}`}
                        title={`Kursi ${id}`}
                      >
                        <SeatIcon status={st} isSelected={sel} />
                        <span className="text-[9px] leading-none mt-0.5 font-mono">{id}</span>
                      </button>
                    )
                  })}
                </div>
              ))}

              <p className="text-[10px] font-bold text-muted text-center mt-4 pt-2 border-t border-borderCol uppercase tracking-widest">
                BELAKANG
              </p>
            </div>

            {/* Legend & Tips */}
            <div className="flex-1 w-full space-y-4">
              <div className="bg-white border border-borderCol rounded-card p-5 shadow-2xs">
                <h3 className="font-bold text-ink text-sm mb-3.5">Legenda</h3>
                <div className="space-y-3">
                  {/* Tersedia */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl border border-borderCol bg-white flex items-center justify-center flex-shrink-0" />
                    <span className="text-xs font-semibold text-ink">Tersedia · {counts.available}</span>
                  </div>

                  {/* Dipilih */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#4F46E5] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <span className="text-xs font-bold text-ink">Dipilih (saya) · {counts.selected}</span>
                  </div>

                  {/* Ditahan orang lain */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-pink-100 border border-pink-300 text-pink-600 flex items-center justify-center flex-shrink-0">
                      <Clock size={14} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-ink">Ditahan orang lain · {counts.held}</p>
                      <p className="text-[11px] text-muted">Sementara, bisa tersedia lagi</p>
                    </div>
                  </div>

                  {/* Terisi */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#0F2A33] text-white flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-black">✕</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-ink">Terisi · {counts.booked}</p>
                      <p className="text-[11px] text-muted">Sudah dibayar</p>
                    </div>
                  </div>

                  {/* Tidak tersedia */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 border border-dashed border-borderCol text-slate-400 flex items-center justify-center flex-shrink-0">
                      <Ban size={13} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-ink">Tidak tersedia · {counts.blocked}</p>
                      <p className="text-[11px] text-muted">Tidak dijual</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tips Info Box */}
              <div className="p-4 bg-primary-tint/50 border border-primary/20 rounded-card text-xs text-ink leading-relaxed">
                <span className="font-bold text-primary block mb-0.5">Tips:</span>
                <span className="text-ink">
                  Pakai tombol panah untuk pindah kursi dan Enter untuk memilih kursi.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Panel (Timer + Trip Summary) ───────────────────── */}
        <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
          {/* Timer Card */}
          <div className="bg-primary-tint/50 border border-primary/20 rounded-card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted">Sisa waktu tahan kursi</span>
              <button type="button" className="text-xs font-bold text-primary hover:underline">
                Kenapa ada timer?
              </button>
            </div>
            <p className="text-3xl sm:text-4xl font-mono font-black text-ink tracking-tight">
              {fmtTime(timeLeft)}
            </p>
            {expired && (
              <p className="text-xs text-error font-medium mt-1">
                Waktu habis! Kursi pilihanmu telah dilepas kembali.
              </p>
            )}
          </div>

          {/* Trip Summary Card */}
          <div className="bg-white border border-borderCol rounded-card p-5 shadow-2xs space-y-4">
            <div>
              <h3 className="font-black text-ink text-base">{from} → {to}</h3>
              <p className="text-xs text-muted mt-1">
                {SCHEDULE_INFO.date} · {SCHEDULE_INFO.dep} – {SCHEDULE_INFO.arr}
              </p>
              <p className="text-xs text-muted">{SCHEDULE_INFO.bus} · {SCHEDULE_INFO.cls}</p>
            </div>

            {selected.length > 0 && (
              <>
                <div className="pt-3 border-t border-borderCol">
                  <p className="text-xs font-bold text-muted mb-2">
                    Kursi pilihanmu ({selected.length} dari {maxSelect})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selected.map(id => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleSeat(id)}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#4F46E5] bg-indigo-50/50 text-[#4F46E5] text-xs font-bold hover:bg-red-50 hover:border-red-400 hover:text-error transition-all"
                      >
                        <Check size={11} strokeWidth={3} />
                        <span>{id}</span>
                        <span className="opacity-60 text-[10px]">✕</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-borderCol space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>{selected.length} kursi × {fmt(SCHEDULE_INFO.price)}</span>
                    <span className="font-semibold text-ink">{fmt(selected.length * SCHEDULE_INFO.price)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-sm font-bold text-ink">Total</span>
                    <span className="text-xl font-black text-ink">
                      {fmt(selected.length * SCHEDULE_INFO.price)}
                    </span>
                  </div>
                </div>
              </>
            )}

            <button
              type="button"
              disabled={selected.length < maxSelect || expired}
              onClick={() =>
                router.push(
                  `/booking/${scheduleId}/passenger?seats=${selected.join(
                    ','
                  )}&from=${from}&to=${to}&passengers=${maxSelect}`
                )
              }
              className="w-full py-3 bg-primary hover:bg-primary-dark disabled:bg-borderCol disabled:text-muted disabled:cursor-not-allowed text-white font-bold rounded-input transition-colors text-sm shadow-sm"
            >
              {selected.length < maxSelect
                ? `Pilih ${maxSelect - selected.length} kursi lagi`
                : 'Lanjut isi data penumpang'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Demo Controls (Bottom) ─────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 mt-8">
        <div className="border border-dashed border-borderCol rounded-card p-3 sm:p-4 bg-white/60 flex items-center gap-3 flex-wrap text-sm">
          <span className="font-bold text-muted text-[11px] uppercase tracking-wider">
            KONTROL DEMO (bukan bagian UI)
          </span>
          <button
            type="button"
            onClick={simulateTaken}
            className="px-3.5 py-1.5 border border-borderCol rounded-full text-ink hover:border-warning hover:text-warning transition-all text-xs font-semibold"
          >
            Simulasikan: kursi direbut
          </button>
          <button
            type="button"
            onClick={() => {
              setTimeLeft(0)
              setExpired(true)
            }}
            className="px-3.5 py-1.5 border border-borderCol rounded-full text-ink hover:border-error hover:text-error transition-all text-xs font-semibold"
          >
            Simulasikan: timer habis
          </button>
          <button
            type="button"
            onClick={resetDemo}
            className="text-xs font-bold text-primary hover:underline ml-auto"
          >
            Reset demo
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SeatPage(props: {
  params: Promise<{ scheduleId: string }>
  searchParams: Promise<{ passengers?: string; from?: string; to?: string; date?: string }>
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface p-8 text-center text-muted">Memuat denah kursi...</div>}>
      <SeatContent {...props} />
    </Suspense>
  )
}

