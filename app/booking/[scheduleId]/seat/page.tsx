'use client'

import { use, useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Stepper from '@/components/Stepper'
import { Check, Clock, Ban, X } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

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

const SCHEDULE_PRESETS: Record<string, {
  dep: string
  arr: string
  bus: string
  cls: string
  price: number
}> = {
  'sch-001': { dep: '05:30', arr: '09:00', bus: 'Lintas Rasa', cls: 'Executive 2–2', price: 105000 },
  'sch-002': { dep: '08:00', arr: '11:30', bus: 'Nusa Trans', cls: 'Executive 2–2', price: 125000 },
  'sch-003': { dep: '11:30', arr: '15:00', bus: 'Cipta Wisata', cls: 'Executive 2–2', price: 125000 },
  'sch-004': { dep: '14:00', arr: '17:30', bus: 'Nusa Trans', cls: 'Executive 2–2', price: 125000 },
  'sch-005': { dep: '19:00', arr: '22:30', bus: 'Lintas Rasa', cls: 'Sleeper 2–1', price: 165000 },
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
      return 'bg-[#FDF2FA] border-[#EDADD6] text-[#C11574] cursor-not-allowed'
    case 'booked':
      return 'bg-ink border-ink text-white cursor-not-allowed'
    case 'blocked':
      return 'bg-surface border-dashed border-borderCol text-muted cursor-not-allowed'
    default:
      return 'bg-white border-borderCol'
  }
}

function SeatIcon({ status, isSelected }: { status: SeatStatus; isSelected: boolean }) {
  if (isSelected) return <Check size={11} strokeWidth={3} className="text-white" />
  if (status === 'held') return <Clock size={11} className="text-pink-600" />
  if (status === 'booked') return <X size={10} strokeWidth={2.5} className="text-white" />
  if (status === 'blocked') return <Ban size={10} className="text-muted" />
  return null
}

/* ─── Page ───────────────────────────────────────────────────── */
function SeatContent({
  params,
  searchParams,
}: {
  params: Promise<{ scheduleId: string }>
  searchParams: Promise<{
    passengers?: string
    from?: string
    to?: string
    date?: string
    dep?: string
    arr?: string
    dur?: string
    bus?: string
    cls?: string
    price?: string
  }>
}) {
  const { scheduleId } = use(params)
  const sp = use(searchParams)
  const maxSelect = parseInt(sp.passengers || '1') || 1
  const from = sp.from ?? 'Jakarta'
  const to = sp.to ?? 'Bandung'

  const preset = SCHEDULE_PRESETS[scheduleId] || SCHEDULE_PRESETS['sch-002']
  const depTime = sp.dep ?? preset.dep
  const arrTime = sp.arr ?? preset.arr
  const busName = sp.bus ? decodeURIComponent(sp.bus) : preset.bus
  const busClass = sp.cls ? decodeURIComponent(sp.cls) : preset.cls
  const pricePerSeat = sp.price ? parseInt(sp.price) : preset.price
  const tripDate = sp.date ? decodeURIComponent(sp.date) : 'Sab, 10 Okt 2026'

  const router = useRouter()
  const { user, openAuthModal } = useAuth()

  /* Seat state - default preselection matches chosen passengers */
  const [seatMap, setSeatMap] = useState<Record<string, SeatStatus>>({ ...INITIAL_MAP })
  const [selected, setSelected] = useState<string[]>(() => {
    const defaultSeats = ['5A', '5B', '6A', '6B']
    return defaultSeats.slice(0, Math.min(Math.max(1, maxSelect), 4))
  })

  /* Timer: 08:37 */
  const [timeLeft, setTimeLeft] = useState(517)
  const [expired, setExpired] = useState(false)
  const [showTimerModal, setShowTimerModal] = useState(false)

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

  /* ─── Titik Paksaan Login / Lazy Registration Checkpoint ───────── */
  /* Setelah Langkah 3 (Pilih Kursi) dan tepat sebelum Langkah 4 (Data Penumpang) */
  const handleProceedToPassenger = () => {
    if (selected.length < maxSelect || expired) return

    const targetUrl = `/booking/${scheduleId}/passenger?seats=${selected.join(
      ','
    )}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&passengers=${maxSelect}&date=${encodeURIComponent(
      tripDate
    )}&dep=${encodeURIComponent(depTime)}&arr=${encodeURIComponent(arrTime)}&bus=${encodeURIComponent(
      busName
    )}&cls=${encodeURIComponent(busClass)}&price=${pricePerSeat}`

    if (user) {
      // Pengguna sudah login -> langsung lanjutkan ke data penumpang
      router.push(targetUrl)
    } else {
      // Pengguna belum login -> arahkan ke halaman autentikasi OAuth & OTP email
      const authUrl = `/booking/${scheduleId}/auth?seats=${selected.join(
        ','
      )}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&passengers=${maxSelect}&date=${encodeURIComponent(
        tripDate
      )}&dep=${encodeURIComponent(depTime)}&arr=${encodeURIComponent(arrTime)}&bus=${encodeURIComponent(
        busName
      )}&cls=${encodeURIComponent(busClass)}&price=${pricePerSeat}&timeLeft=${timeLeft}`
      router.push(authUrl)
    }
  }

  /* Legend counts */
  const counts = {
    available: 19,
    selected: selected.length,
    held: 5,
    booked: 11,
    blocked: 3,
  }

  return (
    <div className="min-h-screen bg-surface pb-28 lg:pb-16">
      <Stepper currentStep={2} />

      {/* ── Layar M Mobile Banner: Kursi Ditahan Timer ──────────────── */}
      <div className="lg:hidden bg-primary-tint/60 border-y border-primary/20 px-3.5 sm:px-4 py-1.5 sm:py-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-mono text-ink">
          <Clock size={14} className="text-primary flex-shrink-0" />
          <span>Kursi ditahan <strong className="font-mono text-xs sm:text-sm text-primary font-bold">{fmtTime(timeLeft)}</strong></span>
        </div>
        <button
          type="button"
          onClick={() => setShowTimerModal(true)}
          className="text-primary hover:underline text-[11px] sm:text-xs font-bold cursor-pointer"
        >
          Kenapa ada timer?
        </button>
      </div>

      {/* ── Layar M Mobile Horizontal Status Legends ────────────────── */}
      <div className="lg:hidden px-3.5 sm:px-4 py-1.5 sm:py-3 bg-white border-b border-borderCol overflow-x-auto flex items-center gap-2.5 sm:gap-3 text-[10px] sm:text-[11px] font-semibold text-ink whitespace-nowrap scrollbar-none">
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded border border-borderCol bg-white flex-shrink-0" />
          <span>Tersedia</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-[#4F46E5] text-white flex items-center justify-center flex-shrink-0">
            <Check size={9} strokeWidth={3} />
          </span>
          <span>Dipilih</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-[#FDF2FA] border border-[#EDADD6] text-[#C11574] flex items-center justify-center text-[9px] flex-shrink-0">
            <Clock size={9} />
          </span>
          <span>Ditahan</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-ink text-white flex items-center justify-center flex-shrink-0">
            <X size={9} strokeWidth={2.5} />
          </span>
          <span>Terisi</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-surface border border-dashed border-borderCol text-muted flex items-center justify-center flex-shrink-0">
            <Ban size={9} />
          </span>
          <span>Tidak dijual</span>
        </div>
      </div>

      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-3.5 sm:px-8 py-2.5 sm:py-5 flex items-start sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-black text-ink">Pilih kursi</h1>
          <p className="text-xs sm:text-sm text-muted mt-0.5 truncate">
            {from} → {to} · {tripDate} · {depTime} · {busName}
          </p>
        </div>
        <button
          onClick={() => router.push(`/schedules?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${encodeURIComponent(tripDate)}&passengers=${maxSelect}`)}
          className="flex-shrink-0 px-3 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold border border-primary text-primary hover:bg-primary-tint/30 rounded-input transition-all"
        >
          Ganti jadwal
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-3.5 sm:px-8 flex flex-col lg:flex-row gap-3.5 sm:gap-6 items-start">
        {/* ── Seat Map Area (Left) ─────────────────────────────────── */}
        <div className="flex-1 w-full min-w-0">

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
            {/* Bus Grid Layout */}
            <div className="bg-white border border-borderCol rounded-2xl p-3 sm:p-6 mx-auto w-full max-w-[340px] sm:max-w-none sm:w-[280px] shadow-2xs flex-shrink-0">
              {/* Bus Front */}
              <div className="flex items-center justify-between text-[11px] font-bold text-muted mb-2.5 sm:mb-4 pb-1.5 sm:pb-2 border-b border-borderCol">
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
              <div className="grid grid-cols-[minmax(38px,1fr)_minmax(38px,1fr)_22px_minmax(38px,1fr)_minmax(38px,1fr)] gap-1.5 sm:gap-2 mb-3 text-center">
                {COLS.slice(0, 2).map(c => (
                  <div key={c} className="text-xs font-bold text-muted">{c}</div>
                ))}
                <div />
                {COLS.slice(2).map(c => (
                  <div key={c} className="text-xs font-bold text-muted">{c}</div>
                ))}
              </div>

              {/* Rows 1..10 */}
              <div className="space-y-2 sm:space-y-2.5">
                {ROWS.map(row => (
                  <div key={row} className="grid grid-cols-[minmax(38px,1fr)_minmax(38px,1fr)_22px_minmax(38px,1fr)_minmax(38px,1fr)] gap-1.5 sm:gap-2 items-center">
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
                          className={`w-full h-12 rounded-xl border text-xs font-bold flex items-center justify-center flex-col transition-all active:scale-95 ${seatClass(
                            st,
                            sel
                          )}`}
                          title={`Kursi ${id}`}
                        >
                          <SeatIcon status={st} isSelected={sel} />
                          <span className="text-[10px] leading-none mt-0.5 font-mono font-bold">{id}</span>
                        </button>
                      )
                    })}

                    {/* Aisle Row Number */}
                    <div className="text-xs text-muted text-center font-bold font-mono">{row}</div>

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
                          className={`w-full h-12 rounded-xl border text-xs font-bold flex items-center justify-center flex-col transition-all active:scale-95 ${seatClass(
                            st,
                            sel
                          )}`}
                          title={`Kursi ${id}`}
                        >
                          <SeatIcon status={st} isSelected={sel} />
                          <span className="text-[10px] leading-none mt-0.5 font-mono font-bold">{id}</span>
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>

              <p className="text-[10px] font-bold text-muted text-center mt-4 pt-2 border-t border-borderCol uppercase tracking-widest">
                BELAKANG BUS · TOILET
              </p>
            </div>

            {/* Mobile Swipe Hint (Screenshot 4) */}
            <p className="lg:hidden text-xs text-muted text-center w-full font-medium py-1">
              Geser untuk melihat baris lainnya
            </p>

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
                    <div className="w-8 h-8 rounded-xl bg-[#FDF2FA] border border-[#EDADD6] text-[#C11574] flex items-center justify-center flex-shrink-0">
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
                      <X size={14} strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-ink">Terisi · {counts.booked}</p>
                      <p className="text-[11px] text-muted">Sudah dibayar</p>
                    </div>
                  </div>

                  {/* Tidak tersedia */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-surface border border-dashed border-borderCol text-muted flex items-center justify-center flex-shrink-0">
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
              <button
                type="button"
                onClick={() => setShowTimerModal(true)}
                className="text-xs font-bold text-primary hover:underline cursor-pointer"
              >
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
                {tripDate} · {depTime} – {arrTime}
              </p>
              <p className="text-xs text-muted">{busName} · {busClass}</p>
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
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary bg-primary-tint/50 text-primary text-xs font-bold hover:bg-red-50 hover:border-red-300 hover:text-error transition-all"
                      >
                        <Check size={11} strokeWidth={3} />
                        <span>{id}</span>
                        <X size={10} strokeWidth={2.5} className="opacity-60" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-borderCol space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>{selected.length} kursi × {fmt(pricePerSeat)}</span>
                    <span className="font-semibold text-ink">{fmt(selected.length * pricePerSeat)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-sm font-bold text-ink">Total</span>
                    <span className="text-xl font-black text-ink">
                      {fmt(selected.length * pricePerSeat)}
                    </span>
                  </div>
                </div>
              </>
            )}

            <button
              type="button"
              disabled={selected.length < maxSelect || expired}
              onClick={handleProceedToPassenger}
              className="hidden lg:flex w-full py-3 bg-primary hover:bg-primary-dark disabled:bg-borderCol disabled:text-muted disabled:cursor-not-allowed text-white font-bold rounded-input transition-colors text-sm shadow-sm items-center justify-center cursor-pointer"
            >
              {selected.length < maxSelect
                ? `Pilih ${maxSelect - selected.length} kursi lagi`
                : 'Lanjut isi data penumpang'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Demo Controls (Bottom) ─────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 mt-4 sm:mt-8">
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
          <Link
            href="/special-states"
            className="text-xs font-bold text-primary hover:underline px-2 py-1 bg-primary-tint border border-primary/30 rounded-md"
          >
            Layar 10: State Khusus
          </Link>
          <button
            type="button"
            onClick={resetDemo}
            className="text-xs font-bold text-primary hover:underline ml-auto"
          >
            Reset demo
          </button>
        </div>
      </div>

      {/* ── Layar M: Mobile Sticky Bottom Summary Bar ─── */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-borderCol p-3.5 sm:p-4 z-40 shadow-xl">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          {/* Selected Seat Chips */}
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            {selected.length === 0 ? (
              <span className="text-xs text-muted">Belum ada kursi</span>
            ) : (
              selected.map(id => (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border-2 border-[#4F46E5] text-[#4F46E5] bg-white font-bold text-xs"
                >
                  <Check size={12} strokeWidth={3} /> {id}
                </span>
              ))
            )}
          </div>

          {/* Price Summary */}
          <div className="text-right flex-shrink-0">
            <span className="text-[10px] text-muted block leading-none mb-0.5">
              Total ({selected.length} kursi)
            </span>
            <span className="text-lg sm:text-xl font-black text-ink leading-tight">
              {fmt(selected.length * pricePerSeat)}
            </span>
          </div>
        </div>

        {/* Large Submit Button (48px height) */}
        <button
          type="button"
          disabled={selected.length < maxSelect || expired}
          onClick={handleProceedToPassenger}
          className="w-full h-12 bg-primary hover:bg-primary-dark disabled:bg-borderCol disabled:text-muted disabled:cursor-not-allowed text-white font-bold rounded-xl transition text-base shadow-sm flex items-center justify-center cursor-pointer"
        >
          {selected.length < maxSelect
            ? `Pilih ${maxSelect - selected.length} kursi lagi`
            : 'Lanjut isi data penumpang'}
        </button>
      </div>

      {/* ── Modal Penjelasan: Kenapa Ada Timer? ─────────────────────── */}
      {showTimerModal && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowTimerModal(false)
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div 
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-borderCol relative animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setShowTimerModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface hover:bg-borderCol/50 text-muted hover:text-ink flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Tutup modal"
            >
              <X size={16} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-primary-tint border border-primary/20 text-primary flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-ink text-base sm:text-lg">
                  Kenapa Ada Timer?
                </h3>
                <p className="text-xs text-muted">
                  Sistem perlindungan kursi RuteKu
                </p>
              </div>
            </div>

            {/* Content points */}
            <div className="space-y-3 text-xs text-ink leading-relaxed">
              <div className="p-3 rounded-xl bg-primary-tint/40 border border-primary/20 flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <strong className="text-ink font-bold block mb-0.5">Kursimu Aman Ditahan (Anti-Rebutan)</strong>
                  <span className="text-muted">
                    Saat kamu memilih kursi di denah, sistem menahan kursi tersebut secara eksklusif selama 10 menit. Orang lain tidak bisa mengambil kursi yang sedang kamu pesan.
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface border border-borderCol flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-secondary text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <strong className="text-ink font-bold block mb-0.5">Waktu Tenang untuk Membayar</strong>
                  <span className="text-muted">
                    Batas waktu 10 menit memberi kamu kesempatan yang cukup untuk mengisi data penumpang dan menyelesaikan pembayaran dengan tenang.
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface border border-borderCol flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <strong className="text-ink font-bold block mb-0.5">Adil Bagi Penumpang Lain</strong>
                  <span className="text-muted">
                    Jika transaksi tidak diselesaikan sampai timer habis, kursi otomatis dilepaskan kembali ke denah agar dapat dipesan oleh penumpang lain yang membutuhkan.
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom button */}
            <div className="mt-5 pt-4 border-t border-borderCol flex items-center justify-between gap-3">
              <Link
                href="/help"
                target="_blank"
                className="text-xs text-primary font-semibold hover:underline"
              >
                Pelajari di FAQ Bantuan →
              </Link>
              <button
                type="button"
                onClick={() => setShowTimerModal(false)}
                className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Mengerti, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SeatPage(props: {
  params: Promise<{ scheduleId: string }>
  searchParams: Promise<{
    passengers?: string
    from?: string
    to?: string
    date?: string
    dep?: string
    arr?: string
    dur?: string
    bus?: string
    cls?: string
    price?: string
  }>
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface p-8 text-center text-muted">Memuat denah kursi...</div>}>
      <SeatContent {...props} />
    </Suspense>
  )
}

