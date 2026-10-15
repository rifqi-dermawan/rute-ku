'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, 
  HelpCircle, 
  Clock, 
  Check, 
  Ban, 
  Share2, 
  History, 
  Download, 
  Smartphone,
  ChevronRight
} from 'lucide-react'

type SeatStatus = 'available' | 'selected' | 'held' | 'booked' | 'blocked'

const INITIAL_SEATS: Record<string, SeatStatus> = {
  '3A': 'booked',  '3B': 'available', '3C': 'available', '3D': 'blocked',
  '4A': 'held',    '4B': 'held',      '4C': 'available', '4D': 'booked',
  '5A': 'selected','5B': 'selected',  '5C': 'booked',    '5D': 'available',
  '6A': 'available','6B': 'available','6C': 'available', '6D': 'held',
  '7A': 'available','7B': 'booked',   '7C': 'booked',    '7D': 'available',
  '8A': 'booked',  '8B': 'available', '8C': 'available', '8D': 'available',
  '9A': 'held',    '9B': 'available', '9C': 'available', '9D': 'booked',
  '10A': 'booked', '10B': 'booked',   '10C': 'blocked',  '10D': 'blocked',
}

const ROWS = [3, 4, 5, 6, 7, 8, 9, 10]

export default function MobilePreviewPage() {
  const [activeScreen, setActiveScreen] = useState<'seat' | 'eticket'>('seat')
  const [seatMap, setSeatMap] = useState<Record<string, SeatStatus>>({ ...INITIAL_SEATS })
  const [selectedSeats, setSelectedSeats] = useState<string[]>(['5A', '5B'])
  const [timeLeft, setTimeLeft] = useState(582) // 09:42

  // Timer countdown
  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(t)
  }, [])

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const toggleSeat = (id: string) => {
    const current = seatMap[id]
    if (current === 'booked' || current === 'held' || current === 'blocked') return

    if (selectedSeats.includes(id)) {
      setSelectedSeats(prev => prev.filter(x => x !== id))
      setSeatMap(prev => ({ ...prev, [id]: 'available' }))
    } else {
      if (selectedSeats.length >= 2) {
        // replace first
        const remove = selectedSeats[0]
        setSeatMap(prev => ({ ...prev, [remove]: 'available', [id]: 'selected' }))
        setSelectedSeats([selectedSeats[1], id])
      } else {
        setSelectedSeats(prev => [...prev, id])
        setSeatMap(prev => ({ ...prev, [id]: 'selected' }))
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#0F2A33]/5 py-10 px-4">
      <div className="max-w-4xl mx-auto mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold font-mono">
              LAYAR M
            </span>
            <h1 className="text-2xl font-black text-ink">
              Mobile View Simulator (390 px)
            </h1>
          </div>
          <p className="text-xs text-muted mt-1 font-medium">
            Memastikan alur inti (Denah Kursi & E-tiket) nyaman dan presisi di layar 390 px dengan tap target minimal 44 px.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-borderCol shadow-2xs">
          <button
            onClick={() => setActiveScreen('seat')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeScreen === 'seat'
                ? 'bg-primary text-white shadow-xs'
                : 'text-ink hover:text-primary'
            }`}
          >
            Layar M: Pilih Kursi
          </button>
          <button
            onClick={() => setActiveScreen('eticket')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeScreen === 'eticket'
                ? 'bg-primary text-white shadow-xs'
                : 'text-ink hover:text-primary'
            }`}
          >
            Layar M: E-tiket
          </button>
        </div>
      </div>

      {/* ─── 390px Mobile Phone Shell Mockup ────────────────────── */}
      <div className="flex justify-center">
        <div className="w-[390px] h-[820px] bg-white rounded-[40px] shadow-2xl border-[8px] border-[#0F2A33] overflow-hidden flex flex-col relative">
          
          {/* Top Notch Speaker */}
          <div className="h-6 bg-white w-full flex items-center justify-center relative flex-shrink-0 z-50">
            <div className="w-24 h-4 bg-[#0F2A33] rounded-full" />
          </div>

          {/* ══════════════ SCREEN 1: PILIH KURSI ══════════════ */}
          {activeScreen === 'seat' && (
            <div className="flex-1 flex flex-col bg-surface overflow-hidden relative">
              {/* Mobile Header Bar */}
              <div className="px-4 py-3 bg-white border-b border-borderCol flex items-center justify-between flex-shrink-0">
                <Link href="/schedules" className="text-ink hover:text-primary p-1 -ml-1">
                  <ArrowLeft size={20} />
                </Link>
                <div className="text-center">
                  <h2 className="text-sm font-bold text-ink leading-tight">Pilih kursi</h2>
                  <p className="text-[10px] text-muted leading-tight mt-0.5">
                    Jakarta → Bandung · Sab 10 Okt · 08:00
                  </p>
                </div>
                <Link href="/help" className="text-ink hover:text-primary p-1 -mr-1">
                  <HelpCircle size={20} />
                </Link>
              </div>

              {/* Teal Timer Bar */}
              <div className="bg-[#E6F4F5] border-b border-[#B8E2E6] px-4 py-2 flex items-center justify-between text-xs flex-shrink-0">
                <div className="flex items-center gap-1.5 font-medium text-ink">
                  <Clock size={14} className="text-primary flex-shrink-0" />
                  <span>Kursi ditahan <strong className="font-mono text-xs font-bold text-ink">{fmtTime(timeLeft)}</strong></span>
                </div>
                <Link href="/help" className="text-primary hover:underline text-[11px] font-semibold">
                  Kenapa ada timer?
                </Link>
              </div>

              {/* Status Legends Strip */}
              <div className="px-4 py-2 bg-white border-b border-borderCol flex items-center justify-between text-[10px] font-medium text-ink flex-shrink-0">
                <div className="flex items-center gap-1">
                  <span className="w-3.5 h-3.5 rounded-sm border border-borderCol bg-white" />
                  <span>Tersedia</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3.5 h-3.5 rounded-sm bg-[#4F46E5] text-white flex items-center justify-center text-[9px] font-bold">✓</span>
                  <span>Dipilih</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3.5 h-3.5 rounded-sm bg-[#FDF2FA] border border-[#EDADD6] text-[#C11574] flex items-center justify-center">
                    <Clock size={8} />
                  </span>
                  <span>Ditahan</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3.5 h-3.5 rounded-sm bg-ink text-white flex items-center justify-center text-[8px] font-bold">✕</span>
                  <span>Terisi</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3.5 h-3.5 rounded-sm bg-surface border border-dashed border-borderCol text-muted flex items-center justify-center text-[8px]">⊘</span>
                  <span>Kosong</span>
                </div>
              </div>

              {/* Scrollable Bus Layout Container */}
              <div className="flex-1 overflow-y-auto px-4 py-4 pb-32">
                {/* Column Headers */}
                <div className="grid grid-cols-[48px_48px_24px_48px_48px] gap-2 mb-2 text-center justify-center text-xs font-bold text-muted">
                  <div>A</div>
                  <div>B</div>
                  <div />
                  <div>C</div>
                  <div>D</div>
                </div>

                {/* Rows 3..10 */}
                <div className="space-y-2 flex flex-col items-center">
                  {ROWS.map(row => (
                    <div key={row} className="grid grid-cols-[48px_48px_24px_48px_48px] gap-2 items-center text-center">
                      {/* Seat A */}
                      {renderMobileSeatButton(row, 'A', seatMap, selectedSeats, toggleSeat)}
                      {/* Seat B */}
                      {renderMobileSeatButton(row, 'B', seatMap, selectedSeats, toggleSeat)}

                      {/* Row Number in Aisle */}
                      <span className="text-xs font-bold text-muted font-mono">{row}</span>

                      {/* Seat C */}
                      {renderMobileSeatButton(row, 'C', seatMap, selectedSeats, toggleSeat)}
                      {/* Seat D */}
                      {renderMobileSeatButton(row, 'D', seatMap, selectedSeats, toggleSeat)}
                    </div>
                  ))}
                </div>

                {/* Swipe hint */}
                <p className="text-[11px] text-muted text-center mt-4 font-medium">
                  Geser untuk melihat baris lainnya
                </p>
              </div>

              {/* Mobile Fixed Sticky Bottom Bar */}
              <div className="absolute bottom-0 inset-x-0 bg-white border-t border-borderCol p-3.5 z-40 shadow-lg">
                <div className="flex items-center justify-between mb-2.5">
                  {/* Pills */}
                  <div className="flex items-center gap-1.5">
                    {selectedSeats.map(id => (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border-2 border-[#4F46E5] text-[#4F46E5] bg-white font-bold text-xs"
                      >
                        <Check size={12} strokeWidth={3} /> {id}
                      </span>
                    ))}
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <span className="text-[10px] text-muted block leading-none">
                      Total · {selectedSeats.length} kursi
                    </span>
                    <span className="text-base font-black text-ink">
                      Rp {(selectedSeats.length * 125000).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                <Link
                  href={`/booking/sched-1/passenger?seats=${selectedSeats.join(',')}&from=Jakarta&to=Bandung&passengers=${selectedSeats.length}`}
                  className="w-full h-11 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition text-sm shadow-sm flex items-center justify-center"
                >
                  Lanjut isi data penumpang
                </Link>
              </div>
            </div>
          )}

          {/* ══════════════ SCREEN 2: E-TIKET ══════════════ */}
          {activeScreen === 'eticket' && (
            <div className="flex-1 flex flex-col bg-surface overflow-y-auto relative p-4 space-y-3.5">
              {/* Header Bar */}
              <div className="flex items-center justify-between pb-1 flex-shrink-0">
                <button
                  onClick={() => setActiveScreen('seat')}
                  className="text-ink hover:text-primary p-1 -ml-1"
                >
                  <ArrowLeft size={20} />
                </button>
                <h2 className="text-base font-bold text-ink">E-tiket</h2>
                <Link href="/help" className="text-ink hover:text-primary p-1 -mr-1">
                  <HelpCircle size={20} />
                </Link>
              </div>

              {/* Green Success Banner */}
              <div className="p-3 rounded-2xl bg-[#EDFDF2] border border-[#A6F4C5] flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-[#12B76A] text-white flex items-center justify-center flex-shrink-0">
                  <Check size={16} strokeWidth={3} />
                </div>
                <p className="text-xs font-bold text-[#027A48] leading-tight">
                  Pembayaran berhasil. Kursi 5A dan 5B resmi milikmu.
                </p>
              </div>

              {/* Ticket Card with Perforation */}
              <div className="bg-white border border-borderCol rounded-2xl overflow-hidden shadow-2xs">
                {/* Top Half */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="block text-[9px] font-bold text-muted uppercase tracking-wider">
                        KODE BOOKING
                      </span>
                      <span className="text-lg font-mono font-black text-ink">
                        RK-7Q4M2X
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-50 text-success border border-green-200 text-[11px] font-bold">
                      <Check size={10} strokeWidth={3} /> Terbayar
                    </span>
                  </div>

                  {/* Route & Times */}
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <div className="text-xl font-black text-ink leading-none">08:00</div>
                      <div className="text-[11px] text-muted mt-0.5">Jakarta</div>
                    </div>
                    <div className="flex-1 px-3 text-center">
                      <span className="text-[10px] text-muted font-medium">3j 30m</span>
                      <div className="w-full h-px bg-borderCol relative my-0.5" />
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black text-ink leading-none">11:30</div>
                      <div className="text-[11px] text-muted mt-0.5">Bandung</div>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted font-medium">
                    Sabtu, 10 Okt 2026 · Nusa Trans Executive 2–2
                  </p>

                  {/* Passenger Chips */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center gap-2.5 p-2 bg-surface rounded-xl text-xs font-semibold text-ink">
                      <span className="px-2 py-0.5 rounded-md bg-white border border-primary text-primary font-mono font-bold text-[11px]">
                        5A
                      </span>
                      <span>Dini Sartika</span>
                    </div>
                    <div className="flex items-center gap-2.5 p-2 bg-surface rounded-xl text-xs font-semibold text-ink">
                      <span className="px-2 py-0.5 rounded-md bg-white border border-primary text-primary font-mono font-bold text-[11px]">
                        5B
                      </span>
                      <span>Rina Putri</span>
                    </div>
                  </div>
                </div>

                {/* Perforated Cutline with Circular Notches */}
                <div className="relative border-t-2 border-dashed border-borderCol my-1">
                  <div className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-surface border-r border-borderCol" />
                  <div className="absolute -right-3 -top-3 w-6 h-6 rounded-full bg-surface border-l border-borderCol" />
                </div>

                {/* Bottom Half: QR Code */}
                <div className="p-4 flex items-center gap-3">
                  <div className="w-20 h-20 bg-white border border-borderCol rounded-lg p-1.5 flex-shrink-0">
                    <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
                      <rect width="100" height="100" fill="white" />
                      <rect x="8" y="8" width="28" height="28" rx="3" fill="#0F2A33" />
                      <rect x="14" y="14" width="16" height="16" rx="1.5" fill="white" />
                      <rect x="18" y="18" width="8" height="8" rx="1" fill="#0B6E78" />
                      <rect x="64" y="8" width="28" height="28" rx="3" fill="#0F2A33" />
                      <rect x="70" y="14" width="16" height="16" rx="1.5" fill="white" />
                      <rect x="74" y="18" width="8" height="8" rx="1" fill="#0B6E78" />
                      <rect x="8" y="64" width="28" height="28" rx="3" fill="#0F2A33" />
                      <rect x="14" y="70" width="16" height="16" rx="1.5" fill="white" />
                      <rect x="18" y="74" width="8" height="8" rx="1" fill="#0B6E78" />
                      <rect x="42" y="12" width="8" height="8" fill="#0F2A33" />
                      <rect x="46" y="24" width="8" height="14" fill="#0B6E78" />
                      <rect x="12" y="44" width="10" height="8" fill="#0F2A33" />
                      <rect x="40" y="42" width="18" height="18" rx="2" fill="#0F2A33" />
                      <rect x="45" y="47" width="8" height="8" fill="white" />
                      <rect x="66" y="44" width="8" height="12" fill="#0B6E78" />
                      <rect x="66" y="68" width="14" height="8" fill="#0F2A33" />
                    </svg>
                  </div>
                  <p className="text-[11px] text-ink leading-snug">
                    Tunjukkan QR ke petugas. Datang <strong>30 menit</strong> sebelum berangkat dan bawa KTP.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => alert('Mengunduh e-tiket PDF...')}
                  className="w-full py-3 bg-[#0B6E78] hover:bg-[#084F57] text-white font-bold rounded-xl text-sm transition shadow-sm"
                >
                  Unduh e-tiket (PDF)
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => alert('Link e-tiket telah disalin!')}
                    className="py-2.5 rounded-xl border border-primary text-primary font-bold text-xs bg-white hover:bg-primary-tint/30 transition text-center"
                  >
                    Bagikan
                  </button>
                  <Link
                    href="/history"
                    className="py-2.5 rounded-xl border border-primary text-primary font-bold text-xs bg-white hover:bg-primary-tint/30 transition text-center block"
                  >
                    Riwayat
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function renderMobileSeatButton(
  row: number,
  col: 'A' | 'B' | 'C' | 'D',
  seatMap: Record<string, SeatStatus>,
  selectedSeats: string[],
  onToggle: (id: string) => void
) {
  const id = `${row}${col}`
  const status = seatMap[id] ?? 'available'
  const isSelected = selectedSeats.includes(id)

  let style = 'bg-white border-borderCol text-ink hover:border-primary'
  if (isSelected) {
    style = 'bg-[#4F46E5] border-[#4338CA] text-white'
  } else if (status === 'held') {
    style = 'bg-[#FDF2FA] border-[#EDADD6] text-[#C11574]'
  } else if (status === 'booked') {
    style = 'bg-ink border-ink text-white'
  } else if (status === 'blocked') {
    style = 'bg-surface border-dashed border-borderCol text-muted'
  }

  return (
    <button
      type="button"
      onClick={() => onToggle(id)}
      disabled={status === 'booked' || status === 'held' || status === 'blocked'}
      className={`w-12 h-12 rounded-xl border text-xs font-bold flex flex-col items-center justify-center transition-all ${style}`}
    >
      {isSelected && <span className="text-[11px] font-black leading-none">✓</span>}
      {!isSelected && status === 'held' && <Clock size={11} className="text-[#C11574]" />}
      {!isSelected && status === 'booked' && <span className="text-[10px] font-black leading-none">✕</span>}
      {!isSelected && status === 'blocked' && <Ban size={11} className="text-muted" />}
      <span className="text-[10px] font-mono leading-none mt-0.5 font-bold">{id}</span>
    </button>
  )
}
