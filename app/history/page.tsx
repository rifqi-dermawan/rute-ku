'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import {
  Check,
  Clock,
  AlertCircle,
  Ticket,
  ArrowRight,
  RefreshCw,
  Search,
  X,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import type { BookingRecord } from '@/lib/booking-store'

type TabType = 'active' | 'completed' | 'cancelled'

function HistoryContent() {
  const { user, openAuthModal } = useAuth()
  const [tab, setTab] = useState<TabType>('active')
  const [bookings, setBookings] = useState<BookingRecord[]>([])
  const [loading, setLoading] = useState(false)
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

  // Fetch bookings strictly for authenticated user (Anti-IDOR)
  const fetchUserBookings = useCallback(async () => {
    if (!user) {
      setBookings([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const emailQuery = encodeURIComponent(user.email.toLowerCase())
      const res = await fetch(`/api/bookings?email=${emailQuery}`)
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal memuat riwayat booking.')
      }

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
  }, [user])

  useEffect(() => {
    fetchUserBookings()
  }, [fetchUserBookings])

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
              className="text-emerald-700 hover:text-emerald-900 text-xs cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-2.5 sm:gap-3">
          <div>
            <h1 className="text-xl sm:text-3xl font-black text-ink tracking-tight">
              Riwayat booking
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-1">
              {user
                ? `Tiket perjalanan terdaftar untuk akun ${user.name} (${user.email}).`
                : 'Kelola e-tiket dan perjalanan bus antarkota Anda.'}
            </p>
          </div>

          {user && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold w-fit">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Akses Privat &amp; Terlindungi</span>
            </div>
          )}
        </div>

        {/* ── UNATHENTICATED STATE: ZERO TICKET LEAKAGE GUARANTEE ── */}
        {!user ? (
          <div className="bg-white border border-borderCol rounded-2xl p-6 sm:p-12 text-center shadow-xs space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary-tint flex items-center justify-center mx-auto text-primary shadow-xs">
              <ShieldCheck size={32} />
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <h2 className="text-lg sm:text-xl font-black text-ink">
                Riwayat Booking Bersifat Privat
              </h2>
              <p className="text-xs sm:text-sm text-muted leading-relaxed">
                Untuk melindungi privasi tiket Anda dan mencegah kebocoran data penumpang, riwayat
                pemesanan hanya dapat diakses oleh pemilik akun yang sah.
              </p>
            </div>

            <div className="pt-3">
              <button
                type="button"
                onClick={() => openAuthModal({ mode: 'login' })}
                className="px-6 py-3 bg-primary hover:bg-primary-dark text-white font-bold text-xs sm:text-sm rounded-full shadow-xs transition-all cursor-pointer inline-flex items-center gap-2 active:scale-95"
              >
                <UserIcon size={16} />
                <span>Masuk ke Akun Anda</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tabs & Refresh */}
            <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setTab('active')}
                className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                  tab === 'active'
                    ? 'bg-primary text-white shadow-xs'
                    : 'border border-borderCol bg-white text-ink hover:border-primary'
                }`}
              >
                Tiket Aktif ({activeList.length})
              </button>

              <button
                type="button"
                onClick={() => setTab('completed')}
                className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
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
                className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                  tab === 'cancelled'
                    ? 'bg-primary text-white shadow-xs'
                    : 'border border-borderCol bg-white text-ink hover:border-primary'
                }`}
              >
                Dibatalkan ({cancelledList.length})
              </button>

              <button
                type="button"
                onClick={fetchUserBookings}
                title="Segarkan riwayat tiket"
                className="ml-auto p-2 rounded-full border border-borderCol bg-white hover:bg-surface text-muted hover:text-ink transition-colors cursor-pointer flex-shrink-0"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-error text-xs flex items-center justify-between">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={fetchUserBookings}
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
            ) : currentList.length === 0 ? (
              /* Empty State */
              <div className="bg-white border border-borderCol rounded-card p-8 sm:p-12 text-center shadow-2xs space-y-4">
                <div className="w-12 h-12 rounded-full bg-surface border border-borderCol flex items-center justify-center mx-auto text-muted">
                  <Ticket size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">
                    {tab === 'active'
                      ? 'Belum ada tiket aktif'
                      : tab === 'completed'
                      ? 'Belum ada perjalanan selesai'
                      : 'Tidak ada tiket yang dibatalkan'}
                  </h3>
                  <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
                    {tab === 'active'
                      ? 'Anda belum memiliki tiket bus yang aktif di akun ini. Pesan tiket perjalanan Anda sekarang.'
                      : 'Tiket riwayat perjalanan Anda akan tercatat di sini secara otomatis.'}
                  </p>
                </div>
                {tab === 'active' && (
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-full text-xs font-bold shadow-2xs transition-colors"
                  >
                    <span>Cari Tiket Bus</span>
                    <ArrowRight size={14} />
                  </Link>
                )}
              </div>
            ) : (
              /* Ticket List */
              <div className="space-y-4">
                {currentList.map((booking) => {
                  const isPaid = booking.status === 'CONFIRMED' || booking.status === 'PAID'
                  const isPending = booking.status === 'PENDING_PAYMENT'
                  const isCancelled = booking.status === 'CANCELLED'

                  return (
                    <div
                      key={booking.id || booking.bookingCode}
                      className="bg-white border border-borderCol rounded-card p-4 sm:p-6 shadow-2xs space-y-3 sm:space-y-4 transition-all hover:border-primary/40"
                    >
                      {/* Top Row */}
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-base sm:text-lg font-black text-ink">
                              {booking.from} → {booking.to}
                            </h2>
                            <span className="px-2 py-0.5 rounded bg-surface border border-borderCol text-[10px] font-bold text-muted font-mono">
                              {booking.bookingCode}
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
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-300 text-xs font-bold">
                              <Clock size={12} /> Menunggu bayar
                            </span>
                          ) : isCancelled ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-error border border-red-200 text-xs font-bold">
                              Dibatalkan
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-surface text-muted border border-borderCol text-xs font-bold">
                              Selesai
                            </span>
                          )}

                          <span className="text-base sm:text-lg font-black text-ink">
                            Rp {(booking.totalAmount || booking.price || 0).toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>

                      {/* Waiting payment warning banner */}
                      {isPending && (
                        <div className="p-3 rounded-xl bg-[#FEF6EE] border border-[#F9DBAF] text-[#93370D] text-xs flex items-center justify-between">
                          <span>
                            Kursi Anda ditahan sementara. Selesaikan pembayaran sebelum waktu habis.
                          </span>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2.5 pt-1">
                        {isPaid && (
                          <>
                            <Link
                              href={`/booking/${booking.scheduleId}/eticket?code=${booking.bookingCode}&publicToken=${booking.publicToken || ''}&seats=${encodeURIComponent(
                                booking.seats
                              )}&from=${encodeURIComponent(booking.from)}&to=${encodeURIComponent(
                                booking.to
                              )}&bus=${encodeURIComponent(booking.bus)}&cls=${encodeURIComponent(
                                booking.cls
                              )}&total=${booking.totalAmount}`}
                              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-input text-xs font-bold shadow-2xs transition-colors inline-flex items-center gap-1.5"
                            >
                              <Ticket size={13} />
                              <span>Lihat E-Tiket</span>
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
                          <Link
                            href={`/booking/${booking.scheduleId}/payment?seats=${encodeURIComponent(
                              booking.seats
                            )}&from=${encodeURIComponent(booking.from)}&to=${encodeURIComponent(
                              booking.to
                            )}&total=${booking.totalAmount}`}
                            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-input text-xs font-bold shadow-2xs transition-colors inline-flex items-center gap-1.5"
                          >
                            <span>Lanjutkan bayar</span>
                            <ArrowRight size={13} />
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Cancel Booking Modal ── */}
      {cancellingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-borderCol space-y-4 animate-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-ink">Konfirmasi Pembatalan Tiket</h3>
                <p className="text-xs text-muted mt-0.5">Kode: {cancellingId}</p>
              </div>
              <button
                type="button"
                onClick={() => setCancellingId(null)}
                className="p-1 rounded-full text-muted hover:text-ink cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {cancelPreview ? (
              <div className="p-3.5 rounded-xl bg-surface border border-borderCol space-y-2 text-xs">
                <div className="flex justify-between font-semibold">
                  <span>Kebijakan Pengembalian Dana:</span>
                  <span className={cancelPreview.eligible ? 'text-primary font-bold' : 'text-error'}>
                    {cancelPreview.refundPercentage}% Refund
                  </span>
                </div>
                <div className="flex justify-between font-bold text-ink text-sm">
                  <span>Estimasi Pengembalian:</span>
                  <span className="text-emerald-700">Rp {cancelPreview.refundAmount.toLocaleString('id-ID')}</span>
                </div>
                <p className="text-muted text-[11px] leading-relaxed pt-1 border-t border-borderCol/60">
                  {cancelPreview.policyText}
                </p>
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-muted flex items-center justify-center gap-2">
                <RefreshCw size={14} className="animate-spin" />
                <span>Memuat kebijakan pembatalan...</span>
              </div>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCancellingId(null)}
                className="flex-1 py-2.5 rounded-input border border-borderCol text-xs font-bold text-ink hover:bg-surface cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={cancelLoading}
                onClick={() => handleCancelBooking(cancellingId)}
                className="flex-1 py-2.5 rounded-input bg-error hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {cancelLoading ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <span>Ya, Batalkan Tiket</span>
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
    <Suspense fallback={<div className="min-h-screen bg-surface p-8 text-center text-muted">Memuat riwayat booking...</div>}>
      <HistoryContent />
    </Suspense>
  )
}
