'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Clock, 
  Check, 
  Ban, 
  Search, 
  Filter, 
  RefreshCw, 
  ArrowLeft, 
  Bus, 
  Users, 
  Calendar, 
  Eye, 
  X, 
  FileText, 
  Info, 
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  LogOut
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

/* ─── Types & Mock Data ────────────────────────────────────────── */
type BookingStatus = 'Terbayar' | 'Ditahan' | 'Dibatalkan'

interface BookingRecord {
  id: string
  codeOrSession: string
  isSession: boolean
  passengers: string
  passengerList?: { name: string; seat: string; phone?: string; idCard?: string }[]
  seats: string[]
  status: BookingStatus
  note: string
  noteDetail?: string
  holdSecondsLeft?: number
  schedule: string
  busClass: string
  totalPrice?: number
  paidAt?: string
  paymentMethod?: string
  refundInfo?: string
}

const INITIAL_BOOKINGS: BookingRecord[] = [
  {
    id: 'b-1',
    codeOrSession: 'RK-7Q4M2X',
    isSession: false,
    passengers: 'Penumpang 1, Penumpang 2',
    passengerList: [
      { name: 'Penumpang 1', seat: '5A', phone: '0812-0000-0001', idCard: '3171024589230001' },
      { name: 'Penumpang 2', seat: '5B', phone: '0813-0000-0002', idCard: '3171024589230002' },
    ],
    seats: ['5A', '5B'],
    status: 'Terbayar',
    note: 'Dibayar 14:11',
    schedule: 'Jakarta → Bandung · Sab 10 Okt · 08:00',
    busClass: 'Executive 2–2',
    totalPrice: 250000,
    paidAt: '10 Okt 2026, 14:11 WIB',
    paymentMethod: 'BCA Virtual Account',
  },
  {
    id: 'b-2',
    codeOrSession: 'RK-3K7P9A',
    isSession: false,
    passengers: 'Budi Hartono',
    passengerList: [
      { name: 'Budi Hartono', seat: '1A', phone: '0811-2233-4455', idCard: '3273010101900003' },
      { name: 'Siti Hartono', seat: '1B', phone: '0811-2233-4456', idCard: '3273010101900004' },
    ],
    seats: ['1A', '1B'],
    status: 'Terbayar',
    note: 'Dibayar 09 Okt 10:02',
    schedule: 'Jakarta → Bandung · Sab 10 Okt · 08:00',
    busClass: 'Executive 2–2',
    totalPrice: 250000,
    paidAt: '09 Okt 2026, 10:02 WIB',
    paymentMethod: 'QRIS',
  },
  {
    id: 's-1',
    codeOrSession: 'Sesi #A91',
    isSession: true,
    passengers: 'Belum mengisi data',
    seats: ['4A', '4B'],
    status: 'Ditahan',
    note: 'Sisa 03:12',
    holdSecondsLeft: 192, // 3m 12s
    schedule: 'Jakarta → Bandung · Sab 10 Okt · 08:00',
    busClass: 'Executive 2–2',
  },
  {
    id: 's-2',
    codeOrSession: 'Sesi #C27',
    isSession: true,
    passengers: 'Mengisi data',
    seats: ['2B'],
    status: 'Ditahan',
    note: 'Sisa 07:40',
    holdSecondsLeft: 460, // 7m 40s
    schedule: 'Jakarta → Bandung · Sab 10 Okt · 08:00',
    busClass: 'Executive 2–2',
  },
  {
    id: 'b-3',
    codeOrSession: 'RK-8M2W4D',
    isSession: false,
    passengers: 'Agus Salim',
    passengerList: [
      { name: 'Agus Salim', seat: '7B', phone: '0818-7654-3210', idCard: '3204011204850005' },
      { name: 'Ahmad Dahlan', seat: '7C', phone: '0818-7654-3211', idCard: '3204011204850006' },
    ],
    seats: ['7B', '7C'],
    status: 'Dibatalkan',
    note: 'Kursi dilepas 09 Okt 13:20',
    schedule: 'Jakarta → Bandung · Sab 10 Okt · 08:00',
    busClass: 'Executive 2–2',
    totalPrice: 250000,
    refundInfo: 'Refund 100% (Rp 250.000) telah diproses ke rekening asal',
  },
]

export default function AdminPage() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<'bookings' | 'seats' | 'help'>('bookings')
  const [scheduleFilter, setScheduleFilter] = useState('Jakarta → Bandung · Sab 10 Okt · 08:00')
  const [statusFilter, setStatusFilter] = useState('Semua status')
  const [searchQuery, setSearchQuery] = useState('')
  const [bookings, setBookings] = useState<BookingRecord[]>(INITIAL_BOOKINGS)
  const [selectedBooking, setSelectedBooking] = useState<BookingRecord | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Countdown timer for hold sessions (simulating real-time dynamic hold state)
  useEffect(() => {
    const timer = setInterval(() => {
      setBookings(prev =>
        prev.map(item => {
          if (item.holdSecondsLeft !== undefined && item.holdSecondsLeft > 0) {
            const nextLeft = item.holdSecondsLeft - 1
            const mins = Math.floor(nextLeft / 60)
            const secs = nextLeft % 60
            const formatted = `Sisa ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
            return {
              ...item,
              holdSecondsLeft: nextLeft,
              note: formatted,
            }
          }
          return item
        })
      )
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Auto refresh indicator pulse every 5 seconds
  useEffect(() => {
    const pulse = setInterval(() => {
      setLastRefreshed(new Date())
    }, 5000)
    return () => clearInterval(pulse)
  }, [])

  const handleManualRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => {
      setLastRefreshed(new Date())
      setIsRefreshing(false)
    }, 400)
  }

  // Filtered rows
  const filteredBookings = bookings.filter(b => {
    // Schedule filter
    if (scheduleFilter && b.schedule !== scheduleFilter) return false
    // Status filter
    if (statusFilter !== 'Semua status' && b.status !== statusFilter) return false
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchCode = b.codeOrSession.toLowerCase().includes(q)
      const matchPass = b.passengers.toLowerCase().includes(q)
      const matchSeats = b.seats.some(s => s.toLowerCase().includes(q))
      if (!matchCode && !matchPass && !matchSeats) return false
    }
    return true
  })

  return (
    <div className="min-h-screen bg-surface flex">
      {/* ─── SIDEBAR (Dark Navy #123B5C from Design System) ────── */}
      <aside className="w-64 bg-[#123B5C] text-white flex-shrink-0 flex flex-col justify-between py-6 px-4">
        <div>
          {/* Brand */}
          <div className="flex items-center gap-3 px-3 py-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/20 shadow-xs">
              <Bus size={20} />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white">
              Rute<span className="text-[#3DD598]">Ku</span> Admin
            </span>
          </div>

          {/* Nav Links */}
          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab('bookings')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all text-left ${
                activeTab === 'bookings'
                  ? 'bg-white text-ink shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>Daftar booking</span>
              {activeTab === 'bookings' && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
            </button>

            <button
              onClick={() => setActiveTab('seats')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left ${
                activeTab === 'seats'
                  ? 'bg-white text-ink shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>Jadwal & kursi</span>
              {activeTab === 'seats' && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
            </button>

            <button
              onClick={() => setActiveTab('help')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left ${
                activeTab === 'help'
                  ? 'bg-white text-ink shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>Pusat bantuan</span>
              {activeTab === 'help' && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
            </button>
          </nav>
        </div>

        {/* Admin User Profile & Back to Client App */}
        <div className="pt-6 border-t border-white/15 space-y-3">
          <div className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{user?.name || 'Staff Admin'}</p>
              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                ADMIN
              </span>
            </div>
            <button
              onClick={() => {
                logout()
                window.location.href = '/admin/login'
              }}
              title="Keluar dari Portal Admin"
              className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <LogOut size={16} />
            </button>
          </div>

          <Link
            href="/"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Kembali ke Web Pemesan</span>
          </Link>
          <div className="px-3 text-[11px] text-white/50">
            RuteKu Internal System v1.0
          </div>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ─────────────────────────────────────── */}
      <main className="flex-1 p-8 lg:p-10 overflow-y-auto">
        {activeTab === 'bookings' && (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold text-ink tracking-tight">
                  Daftar booking
                </h1>
                <p className="text-sm text-muted mt-1 font-medium">
                  Hanya lihat. Hold kursi dilepas otomatis oleh sistem saat timer habis.
                </p>
              </div>

              {/* Real-time Indicator */}
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-borderCol text-xs font-semibold text-ink shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-[#15803D] animate-pulse" />
                  <span>Diperbarui otomatis tiap 5 detik</span>
                </div>
                <button
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  title="Segarkan data sekarang"
                  className="p-2 rounded-full bg-white border border-borderCol hover:border-primary text-muted hover:text-primary transition shadow-2xs"
                >
                  <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-primary' : ''} />
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white border border-borderCol rounded-2xl p-5 shadow-2xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Filter Jadwal */}
                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5">
                    Jadwal
                  </label>
                  <select
                    value={scheduleFilter}
                    onChange={e => setScheduleFilter(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-borderCol bg-surface text-ink text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="Jakarta → Bandung · Sab 10 Okt · 08:00">
                      Jakarta → Bandung · Sab 10 Okt · 08:00
                    </option>
                    <option value="Bandung → Jakarta · Sab 10 Okt · 14:00">
                      Bandung → Jakarta · Sab 10 Okt · 14:00
                    </option>
                  </select>
                </div>

                {/* Filter Status */}
                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-borderCol bg-surface text-ink text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="Semua status">Semua status</option>
                    <option value="Terbayar">Terbayar</option>
                    <option value="Ditahan">Ditahan</option>
                    <option value="Dibatalkan">Dibatalkan</option>
                  </select>
                </div>

                {/* Search */}
                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5">
                    Cari kode atau nama
                  </label>
                  <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="RK-... atau nama"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-borderCol bg-surface text-ink text-sm font-medium placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Metric Summary Cards (4 Cards) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Card 1: Tersedia */}
              <div className="bg-white border border-borderCol rounded-2xl p-5 flex items-center gap-4 shadow-2xs">
                <div className="w-10 h-10 rounded-xl border-2 border-borderCol flex items-center justify-center text-muted">
                  <span className="w-3.5 h-3.5 rounded-sm border border-borderCol" />
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-ink">21</div>
                  <div className="text-xs font-semibold text-muted">Tersedia</div>
                </div>
              </div>

              {/* Card 2: Ditahan */}
              <div className="bg-white border border-borderCol rounded-2xl p-5 flex items-center gap-4 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-[#FDF2FA] border border-[#EDADD6] text-[#C11574] flex items-center justify-center">
                  <Clock size={18} />
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-ink">5</div>
                  <div className="text-xs font-semibold text-muted">Ditahan</div>
                </div>
              </div>

              {/* Card 3: Terisi */}
              <div className="bg-white border border-borderCol rounded-2xl p-5 flex items-center gap-4 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-ink text-white flex items-center justify-center">
                  <span className="text-sm font-black">✕</span>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-ink">11</div>
                  <div className="text-xs font-semibold text-muted">Terisi</div>
                </div>
              </div>

              {/* Card 4: Tidak tersedia */}
              <div className="bg-white border border-borderCol rounded-2xl p-5 flex items-center gap-4 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-surface border border-dashed border-borderCol text-muted flex items-center justify-center">
                  <Ban size={18} />
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-ink">3</div>
                  <div className="text-xs font-semibold text-muted">Tidak tersedia</div>
                </div>
              </div>
            </div>

            {/* Data Table */}
            <div className="bg-white border border-borderCol rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-borderCol bg-surface/60 text-[11px] font-bold text-muted uppercase tracking-wider">
                      <th className="py-4 px-6">KODE / SESI</th>
                      <th className="py-4 px-6">PENUMPANG</th>
                      <th className="py-4 px-6">KURSI</th>
                      <th className="py-4 px-6">STATUS</th>
                      <th className="py-4 px-6">KETERANGAN</th>
                      <th className="py-4 px-6 text-right">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borderCol text-sm font-medium text-ink">
                    {filteredBookings.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-muted">
                          Tidak ada data yang sesuai filter.
                        </td>
                      </tr>
                    ) : (
                      filteredBookings.map(row => (
                        <tr key={row.id} className="hover:bg-surface/40 transition-colors">
                          {/* Kode / Sesi */}
                          <td className="py-4 px-6">
                            <span className="font-mono font-bold text-ink">
                              {row.codeOrSession}
                            </span>
                          </td>

                          {/* Penumpang */}
                          <td className="py-4 px-6">
                            <span className={row.isSession ? 'text-muted italic' : 'text-ink font-semibold'}>
                              {row.passengers}
                            </span>
                          </td>

                          {/* Kursi */}
                          <td className="py-4 px-6">
                            <span className="font-mono font-bold text-ink">
                              {row.seats.join(', ')}
                            </span>
                          </td>

                          {/* Status Badge */}
                          <td className="py-4 px-6">
                            {row.status === 'Terbayar' && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EDF7ED] text-[#15803D] border border-[#A6E9B9] text-xs font-bold">
                                Terbayar
                              </span>
                            )}
                            {row.status === 'Ditahan' && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FDF2FA] text-[#C11574] border border-[#EDADD6] text-xs font-bold">
                                <Clock size={12} />
                                Ditahan
                              </span>
                            )}
                            {row.status === 'Dibatalkan' && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA] text-xs font-bold">
                                <span className="font-black text-[10px]">✕</span>
                                Dibatalkan
                              </span>
                            )}
                          </td>

                          {/* Keterangan */}
                          <td className="py-4 px-6">
                            <span className={`text-sm ${row.holdSecondsLeft ? 'font-mono font-semibold text-[#C11574]' : 'text-muted'}`}>
                              {row.note}
                            </span>
                          </td>

                          {/* Aksi */}
                          <td className="py-4 px-6 text-right">
                            {!row.isSession ? (
                              <button
                                onClick={() => setSelectedBooking(row)}
                                className="text-primary hover:text-primary-dark font-bold text-sm hover:underline cursor-pointer transition"
                              >
                                Lihat
                              </button>
                            ) : (
                              <span className="text-muted/40 font-mono">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: JADWAL & KURSI (Visual Layout for Admin) ─────── */}
        {activeTab === 'seats' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-extrabold text-ink tracking-tight">
                  Status Denah Kursi Real-Time
                </h1>
                <p className="text-sm text-muted mt-1 font-medium">
                  {scheduleFilter} · Nusa Trans Executive 2–2
                </p>
              </div>
              <button
                onClick={() => setActiveTab('bookings')}
                className="text-sm font-bold text-primary hover:underline flex items-center gap-1"
              >
                <ArrowLeft size={16} />
                Kembali ke Daftar Booking
              </button>
            </div>

            {/* Visual bus status diagram */}
            <div className="bg-white border border-borderCol rounded-2xl p-6 shadow-2xs">
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold mb-6 pb-4 border-b border-borderCol">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-md border border-borderCol bg-white" />
                  <span>Tersedia (21)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-md bg-[#FDF2FA] border border-[#EDADD6] text-[#C11574] flex items-center justify-center text-[10px]">
                    <Clock size={10} />
                  </div>
                  <span>Ditahan sesi (5)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-md bg-ink text-white flex items-center justify-center text-[10px] font-bold">
                    ✕
                  </div>
                  <span>Terisi terbayar (11)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-md bg-surface border border-dashed border-borderCol text-muted flex items-center justify-center text-[10px]">
                    <Ban size={10} />
                  </div>
                  <span>Tidak dijual (3)</span>
                </div>
              </div>

              {/* Admin seat grid preview */}
              <div className="max-w-md mx-auto p-4 rounded-xl bg-surface border border-borderCol text-center">
                <div className="text-xs font-bold text-muted mb-4 uppercase tracking-wider">
                  Depan Bus / Supir
                </div>
                <div className="space-y-2">
                  {[
                    { r: 1, a: 'booked', b: 'booked', c: 'available', d: 'available' },
                    { r: 2, a: 'available', b: 'held', c: 'available', d: 'available' },
                    { r: 3, a: 'booked', b: 'available', c: 'available', d: 'blocked' },
                    { r: 4, a: 'held', b: 'held', c: 'available', d: 'booked' },
                    { r: 5, a: 'booked', b: 'booked', c: 'booked', d: 'available' },
                    { r: 6, a: 'available', b: 'available', c: 'available', d: 'held' },
                    { r: 7, a: 'available', b: 'available', c: 'available', d: 'available' },
                    { r: 8, a: 'booked', b: 'available', c: 'available', d: 'available' },
                    { r: 9, a: 'held', b: 'available', c: 'available', d: 'booked' },
                    { r: 10, a: 'booked', b: 'booked', c: 'blocked', d: 'blocked' },
                  ].map(row => (
                    <div key={row.r} className="flex items-center justify-center gap-3">
                      <div className="flex gap-1.5">
                        <span className={`w-9 h-9 rounded-lg border text-xs font-bold font-mono flex items-center justify-center ${
                          row.a === 'booked' ? 'bg-ink text-white border-ink' :
                          row.a === 'held' ? 'bg-[#FDF2FA] border-[#EDADD6] text-[#C11574]' :
                          row.a === 'blocked' ? 'bg-surface border-dashed border-borderCol text-muted' :
                          'bg-white border-borderCol text-ink'
                        }`}>
                          {row.r}A
                        </span>
                        <span className={`w-9 h-9 rounded-lg border text-xs font-bold font-mono flex items-center justify-center ${
                          row.b === 'booked' ? 'bg-ink text-white border-ink' :
                          row.b === 'held' ? 'bg-[#FDF2FA] border-[#EDADD6] text-[#C11574]' :
                          row.b === 'blocked' ? 'bg-surface border-dashed border-borderCol text-muted' :
                          'bg-white border-borderCol text-ink'
                        }`}>
                          {row.r}B
                        </span>
                      </div>

                      <span className="w-5 text-[11px] font-bold text-muted">{row.r}</span>

                      <div className="flex gap-1.5">
                        <span className={`w-9 h-9 rounded-lg border text-xs font-bold font-mono flex items-center justify-center ${
                          row.c === 'booked' ? 'bg-ink text-white border-ink' :
                          row.c === 'held' ? 'bg-[#FDF2FA] border-[#EDADD6] text-[#C11574]' :
                          row.c === 'blocked' ? 'bg-surface border-dashed border-borderCol text-muted' :
                          'bg-white border-borderCol text-ink'
                        }`}>
                          {row.r}C
                        </span>
                        <span className={`w-9 h-9 rounded-lg border text-xs font-bold font-mono flex items-center justify-center ${
                          row.d === 'booked' ? 'bg-ink text-white border-ink' :
                          row.d === 'held' ? 'bg-[#FDF2FA] border-[#EDADD6] text-[#C11574]' :
                          row.d === 'blocked' ? 'bg-surface border-dashed border-borderCol text-muted' :
                          'bg-white border-borderCol text-ink'
                        }`}>
                          {row.r}D
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: PUSAT BANTUAN ADMIN ──────────────────────────── */}
        {activeTab === 'help' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <h1 className="text-3xl font-extrabold text-ink tracking-tight">
              Panduan & Kebijakan Admin
            </h1>

            <div className="space-y-4">
              <div className="bg-white border border-borderCol rounded-2xl p-5 shadow-2xs">
                <h3 className="font-bold text-ink text-base flex items-center gap-2">
                  <ShieldCheck size={18} className="text-primary" />
                  Mekanisme Hold Kursi 10 Menit
                </h3>
                <p className="text-sm text-muted mt-2 leading-relaxed">
                  Ketika calon penumpang memilih kursi di denah, server akan mengunci (atomic hold) kursi tersebut selama 10 menit dengan UUID sesi unik. Kursi ditandai dengan badge merah muda (Ditahan). Admin tidak perlu melepas manual; cron job / server action secara atomik akan membersihkan kursi saat waktu kedaluwarsa habis.
                </p>
              </div>

              <div className="bg-white border border-borderCol rounded-2xl p-5 shadow-2xs">
                <h3 className="font-bold text-ink text-base flex items-center gap-2">
                  <Info size={18} className="text-primary" />
                  Kebijakan Pembatalan & Refund
                </h3>
                <p className="text-sm text-muted mt-2 leading-relaxed">
                  Pembatalan sebelum 2 jam keberangkatan berhak mendapatkan refund 100% dari biaya tiket. Kursi otomatis dibuka kembali statusnya menjadi Tersedia di tabel booking dan denah pelanggan.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ─── MODAL DETAIL BOOKING ─────────────────────────────── */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-borderCol max-w-lg w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            {/* Close button */}
            <button
              onClick={() => setSelectedBooking(null)}
              className="absolute right-4 top-4 w-8 h-8 rounded-full bg-surface border border-borderCol flex items-center justify-center text-muted hover:text-ink transition"
            >
              <X size={16} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-tint text-primary flex items-center justify-center">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink">
                  Detail Booking {selectedBooking.codeOrSession}
                </h3>
                <p className="text-xs text-muted">
                  {selectedBooking.schedule}
                </p>
              </div>
            </div>

            {/* Content Details */}
            <div className="mt-6 space-y-4 text-sm">
              <div className="p-3.5 rounded-xl bg-surface border border-borderCol flex items-center justify-between">
                <span className="text-muted font-medium">Status Pembayaran</span>
                {selectedBooking.status === 'Terbayar' ? (
                  <span className="px-3 py-1 rounded-full bg-[#EDF7ED] text-[#15803D] border border-[#A6E9B9] text-xs font-bold">
                    Terbayar
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA] text-xs font-bold">
                    Dibatalkan
                  </span>
                )}
              </div>

              {/* Passengers */}
              <div>
                <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">
                  Daftar Penumpang & Kursi
                </h4>
                <div className="space-y-2">
                  {selectedBooking.passengerList?.map((p, idx) => (
                    <div key={idx} className="p-3 rounded-xl border border-borderCol bg-white flex items-center justify-between">
                      <div>
                        <div className="font-bold text-ink">{p.name}</div>
                        <div className="text-xs text-muted">
                          {p.phone} · KTP: {p.idCard}
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-md bg-primary-tint text-primary border border-primary/30 font-mono font-bold text-xs">
                        {p.seat}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing & Method */}
              <div className="pt-2 border-t border-borderCol space-y-1.5 text-xs">
                <div className="flex justify-between text-muted">
                  <span>Metode Pembayaran</span>
                  <span className="font-semibold text-ink">{selectedBooking.paymentMethod ?? '-'}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Waktu Pembayaran</span>
                  <span className="font-semibold text-ink">{selectedBooking.paidAt ?? '-'}</span>
                </div>
                {selectedBooking.refundInfo && (
                  <div className="p-2.5 rounded-lg bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] text-xs mt-2">
                    {selectedBooking.refundInfo}
                  </div>
                )}
                {selectedBooking.totalPrice && (
                  <div className="flex justify-between text-ink font-bold text-sm pt-2 border-t border-borderCol">
                    <span>Total Pembayaran</span>
                    <span className="text-primary font-mono text-base">
                      Rp {selectedBooking.totalPrice.toLocaleString('id-ID')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer action */}
            <div className="mt-6 pt-4 border-t border-borderCol flex justify-end">
              <button
                onClick={() => setSelectedBooking(null)}
                className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-dark transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
