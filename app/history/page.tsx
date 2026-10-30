'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Check,
  Clock,
  AlertCircle,
  Ticket,
  ArrowRight,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import type { BookingRecord } from '@/lib/booking-store'

type TabType = 'active' | 'completed' | 'cancelled'

function HistoryContent() {
  const searchParams = useSearchParams()
  const initialCode = searchParams?.get('code') || ''

  const [searchQuery, setSearchQuery] = useState(initialCode)
  const [tab, setTab] = useState<TabType>('active')
  const [bookings, setBookings] = useState<BookingRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState('')
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [cancelPreview, setCancelPreview] = useState<{
    eligible: boolean
    refundPercentage: number
    refundAmount: number
    policyText: string
    reason: string
  } | null>(null)

  // Fetch bookings by code or email
  const fetchBookings = useCallback(async (query: string) => {
    const q = query.trim()
    if (!q) {
      setBookings([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    setHasSearched(true)

    try {
      const isEmail = q.includes('@')
      const url = isEmail
        ? `/api/bookings?email=${encodeURIComponent(q.toLowerCase())}`
        : `/api/bookings?code=${encodeURIComponent(q.toUpperCase())}`

      const res = await fetch(url)
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal memuat riwayat booking.')
      }

      // Format data into BookingRecord
      const rawList = data.bookings || (data.booking ? [data.booking] : [])
      const mapped: BookingRecord[] = rawList.map((b: any) => {
        const schedule = b.schedule || {}
        const bus = schedule.bus || {}
        const route = schedule.route || {}
        const stops = schedule.scheduleStops || []
        const originStop = stops.find((s: any) => s.stopSequence === 1)
        const destStop = stops.find((s: any) => s.stopSequence === stops.length)

        const depTime = originStop?.departureAt
          ? new Date(originStop.departureAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          : '08:00'
        const arrTime = destStop?.arrivalAt
          ? new Date(destStop.arrivalAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          : '16:00'

        const dateStr = originStop?.departureAt
          ? new Date(originStop.departureAt).toLocaleDateString('id-ID', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
          : 'Jadwal Reguler'

        const seatList = (b.seats || []).map((s: any) => s.seatNumber).join(', ')
        const paxList = (b.passengers || []).map((p: any) => p.fullName).join(', ')

        return {
          id: b.id,
          bookingCode: b.code,
          publicToken: b.publicToken,
          scheduleId: b.scheduleId,
          from: route.originCity?.name?.replace(/^Kota\s+/i, '') || 'Asal',
          to: route.destinationCity?.name?.replace(/^Kota\s+/i, '') || 'Tujuan',
          date: dateStr,
          dep: depTime,
          arr: arrTime,
          bus: bus.operator?.name || 'Bus Executive',
          cls: bus.busClass || 'Executive 2–2',
          seats: seatList || '-',
          passengers: paxList || b.contactName || 'Penumpang',
          price: b.ticketTotal || 0,
          totalAmount: b.grandTotal || 0,
          status: b.status,
          createdAt: b.createdAt,
          cancelledAt: b.cancelledAt,
        }
      })

      setBookings(mapped)
    } catch (err: any) {
      setError(err.message || 'Terjadi kendala saat mengambil data tiket.')
      setBookings([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-search on mount if code query parameter or recent bookings exist
  useEffect(() => {
    if (initialCode) {
      fetchBookings(initialCode)
    } else if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('ruteku_recent_bookings')
        const list = raw ? JSON.parse(raw) : []
        if (Array.isArray(list) && list.length > 0) {
          setSearchQuery(list[0])
          fetchBookings(list[0])
        }
      } catch {}
    }
  }, [initialCode, fetchBookings])

  // Preview refund policy when cancel modal opens
  useEffect(() => {
    if (!cancellingId) {
      setCancelPreview(null)
      return
    }
    fetch(`/api/bookings/${encodeURIComponent(cancellingId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'preview_cancel' }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.preview) setCancelPreview(data.preview)
      })
      .catch(() => {})
  }, [cancellingId])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      fetchBookings(searchQuery)
    }
  }

  // Handle Cancel Booking
  const handleCancelBooking = async (idOrCode: string) => {
    setCancelLoading(true)

    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(idOrCode)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'cancel' }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal membatalkan booking.')
      }

      setBookings((prev) =>
        prev.map((b) =>
          b.id === idOrCode || b.bookingCode === idOrCode
            ? { ...b, status: 'CANCELLED', cancelledAt: new Date().toISOString() }
            : b
        )
      )

      setCancellingId(null)
      setToastMessage('Tiket berhasil dibatalkan. Pengembalian dana akan diproses sesuai ketentuan.')
      setTimeout(() => setToastMessage(null), 5000)
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat membatalkan tiket.')
    } finally {
      setCancelLoading(false)
    }
  }

  // Segment bookings by tab
  const activeList = bookings.filter(
    (b) => b.status === 'CONFIRMED' || b.status === 'PAID' || b.status === 'PENDING_PAYMENT'
  )
  const completedList = bookings.filter((b) => (b.status as string) === 'COMPLETED')
  const cancelledList = bookings.filter((b) => b.status === 'CANCELLED')

  const currentList =
    tab === 'active' ? activeList : tab === 'completed' ? completedList : cancelledList

  return (
    <div className="min-h-screen bg-surface pb-20">
      <main className="max-w-4xl mx-auto px-3.5 sm:px-6 py-4 sm:py-8">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-2xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <Check size={16} className="text-emerald-600" />
              <span>{toastMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-emerald-700 hover:text-emerald-900 text-xs"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-3xl font-black text-ink tracking-tight">
            Riwayat booking &amp; cek e-tiket
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Cek status pesanan, unduh e-tiket resmi, atau kelola pembatalan perjalanan bus Anda.
          </p>
        </div>

        {/* Pencarian Tiket Tamu */}
        <div className="bg-white border border-borderCol rounded-card p-3.5 sm:p-5 mb-5 shadow-2xs">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Masukkan Kode Booking (contoh: RK-ABCDEF) atau Email Pemesan"
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-surface border border-borderCol rounded-input focus:outline-none focus:border-primary text-ink font-medium"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !searchQuery.trim()}
              className="px-6 py-2.5 bg-primary hover:bg-primary-dark disabled:bg-borderCol disabled:text-muted disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm rounded-input shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
              <span>Cari Tiket</span>
            </button>
          </form>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-error text-xs flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => fetchBookings(searchQuery)}
              className="font-bold underline ml-2 cursor-pointer"
            >
              Coba lagi
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-white border border-borderCol rounded-card p-5 animate-pulse space-y-3"
              >
                <div className="h-5 bg-borderCol/60 rounded w-1/3"></div>
                <div className="h-3 bg-borderCol/40 rounded w-1/2"></div>
                <div className="h-8 bg-borderCol/30 rounded w-28 mt-2"></div>
              </div>
            ))}
          </div>
        ) : !hasSearched && bookings.length === 0 ? (
          /* Initial Guidance State */
          <div className="bg-white border border-borderCol rounded-card p-8 sm:p-12 text-center shadow-2xs space-y-4">
            <div className="w-14 h-14 rounded-full bg-primary-tint border border-primary/20 flex items-center justify-center mx-auto text-primary">
              <Ticket size={28} />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-ink">
                Lacak Tiket Perjalanan Anda
              </h3>
              <p className="text-xs sm:text-sm text-muted leading-relaxed">
                Pemesanan di RuteKu tidak memerlukan akun. Masukkan kode booking Anda (misal{' '}
                <strong className="text-ink font-mono">RK-XXXXXX</strong>) atau alamat email pemesan
                pada formulir di atas untuk melihat detail tiket.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-full text-xs sm:text-sm font-bold shadow-xs transition-colors"
              >
                <span>Cari Tiket Bus Baru</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ) : currentList.length === 0 ? (
          /* Empty Search Result */
          <div className="bg-white border border-borderCol rounded-card p-8 sm:p-12 text-center shadow-2xs space-y-4">
            <div className="w-12 h-12 rounded-full bg-surface border border-borderCol flex items-center justify-center mx-auto text-muted">
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink">
                Tiket tidak ditemukan
              </h3>
              <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
                Tidak ada data booking yang cocok dengan kata kunci{' '}
                <strong className="text-ink font-mono">&quot;{searchQuery}&quot;</strong>. Pastikan kode booking atau alamat email sudah sesuai.
              </p>
            </div>
          </div>
        ) : (
          /* Results View */
          <>
            {/* Tabs */}
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
              <button
                type="button"
                onClick={() => setTab('active')}
                className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  tab === 'active'
                    ? 'bg-primary text-white shadow-xs'
                    : 'border border-borderCol bg-white text-ink hover:border-primary'
                }`}
              >
                Aktif ({activeList.length})
              </button>

              <button
                type="button"
                onClick={() => setTab('completed')}
                className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  tab === 'completed'
                    ? 'bg-primary text-white shadow-xs'
                    : 'border border-borderCol bg-white text-ink hover:border-primary'
                }`}
              >
                Selesai ({completedList.length})
              </button>

              <button
                type="button"
                onClick={() => setTab('cancelled')}
                className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  tab === 'cancelled'
                    ? 'bg-primary text-white shadow-xs'
                    : 'border border-borderCol bg-white text-ink hover:border-primary'
                }`}
              >
                Dibatalkan ({cancelledList.length})
              </button>
            </div>

            {/* Ticket Cards */}
            <div className="space-y-4">
              {currentList.map((booking) => {
                const isPaid = booking.status === 'CONFIRMED' || booking.status === 'PAID'
                const isPending = booking.status === 'PENDING_PAYMENT'
                const isCancelled = booking.status === 'CANCELLED'

                return (
                  <div
                    key={booking.id || booking.bookingCode}
                    className="bg-white border border-borderCol rounded-card p-3.5 sm:p-6 shadow-2xs space-y-3 sm:space-y-4 transition-all hover:border-primary/40"
                  >
                    {/* Top Row */}
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base sm:text-lg font-black text-ink">
                            {booking.from} → {booking.to}
                          </h2>
                          <span className="px-2 py-0.5 rounded bg-surface border border-borderCol text-[10px] font-bold text-muted font-mono">
                            {booking.bookingCode || booking.id}
                          </span>
                        </div>
                        <p className="text-xs text-muted mt-1 font-medium">
                          {booking.date} · Kursi <strong className="text-ink">{booking.seats}</strong>
                          {booking.passengers && (
                            <span>
                              {' '}
                              · Penumpang: <strong className="text-ink">{booking.passengers}</strong>
                            </span>
                          )}
                          {booking.bus && <span> · {booking.bus}</span>}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                            <Check size={12} strokeWidth={3} /> Terbayar
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                            <Clock size={12} /> Menunggu Bayar
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-error border border-red-200 text-xs font-bold">
                            Dibatalkan
                          </span>
                        )}

                        <span className="text-sm sm:text-base font-black text-ink">
                          Rp {booking.totalAmount.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-2 border-t border-borderCol/50 flex items-center justify-between flex-wrap gap-2">
                      <div className="text-[11px] text-muted font-mono">
                        {booking.dep} – {booking.arr} WIB
                      </div>

                      <div className="flex items-center gap-2">
                        {isPaid && (
                          <>
                            <Link
                              href={`/booking/${booking.scheduleId}/eticket?code=${encodeURIComponent(
                                booking.bookingCode
                              )}&publicToken=${encodeURIComponent(booking.publicToken || '')}`}
                              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-input text-xs font-bold shadow-2xs transition-colors inline-flex items-center gap-1.5"
                            >
                              <Ticket size={13} />
                              <span>Lihat e-tiket</span>
                            </Link>

                            <button
                              type="button"
                              onClick={() => setCancellingId(booking.bookingCode || booking.id)}
                              className="px-4 py-2 border border-[#FDA29B] text-[#B42318] hover:bg-red-50 rounded-input text-xs font-bold transition-colors cursor-pointer"
                            >
                              Batalkan booking
                            </button>
                          </>
                        )}

                        {isPending && (
                          <>
                            <Link
                              href={`/booking/${booking.scheduleId}/payment?seats=${encodeURIComponent(
                                booking.seats
                              )}&from=${encodeURIComponent(booking.from)}&to=${encodeURIComponent(
                                booking.to
                              )}&total=${booking.totalAmount}`}
                              className="px-5 py-2 bg-primary hover:bg-primary-dark text-white rounded-input text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                            >
                              Lanjutkan pembayaran
                            </Link>

                            <button
                              type="button"
                              onClick={() => setCancellingId(booking.bookingCode || booking.id)}
                              className="px-4 py-2 border border-borderCol text-muted hover:text-ink hover:bg-surface rounded-input text-xs font-bold transition-colors cursor-pointer"
                            >
                              Batal
                            </button>
                          </>
                        )}

                        {isCancelled && (
                          <span className="text-[11px] text-muted font-medium">
                            Tiket ini telah dibatalkan dan tidak dapat digunakan.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </main>

      {/* Cancel Confirmation Modal */}
      {cancellingId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-card border border-borderCol p-6 max-w-md w-full shadow-lg space-y-4">
            <div className="flex items-center gap-2 text-error">
              <AlertCircle size={22} />
              <h3 className="font-bold text-base text-ink">Konfirmasi Pembatalan Tiket</h3>
            </div>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              Apakah Anda yakin ingin membatalkan booking{' '}
              <strong className="text-ink font-mono">{cancellingId}</strong>?
            </p>

            {cancelPreview ? (
              <div className="p-3 bg-surface rounded-xl border border-borderCol space-y-1.5 text-xs">
                <div className="flex justify-between font-bold text-ink">
                  <span>Status Pengembalian:</span>
                  <span className={cancelPreview.eligible ? 'text-emerald-700' : 'text-error'}>
                    {cancelPreview.eligible
                      ? `${cancelPreview.refundPercentage}% Refund`
                      : 'Tidak Dapat Dibatalkan'}
                  </span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Estimasi Pengembalian:</span>
                  <span className="font-bold text-ink">
                    Rp {cancelPreview.refundAmount.toLocaleString('id-ID')}
                  </span>
                </div>
                <p className="text-[11px] text-muted pt-1 border-t border-borderCol/50">
                  {cancelPreview.policyText}
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted">Memuat rincian aturan pembatalan...</p>
            )}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={cancelLoading}
                onClick={() => setCancellingId(null)}
                className="px-4 py-2 border border-borderCol rounded-input text-xs font-bold text-ink hover:bg-surface cursor-pointer"
              >
                Kembali
              </button>
              <button
                type="button"
                disabled={cancelLoading}
                onClick={() => handleCancelBooking(cancellingId)}
                className="px-4 py-2 bg-error hover:bg-red-700 text-white rounded-input text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                {cancelLoading ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <span>Ya, Batalkan Booking</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface p-8 text-center text-muted">
          Memuat riwayat booking...
        </div>
      }
    >
      <HistoryContent />
    </Suspense>
  )
}
