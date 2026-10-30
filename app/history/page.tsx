'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Check,
  Clock,
  AlertCircle,
  ShieldCheck,
  Ticket,
  User as UserIcon,
  ArrowRight,
  RefreshCw,
  X,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import type { BookingRecord } from '@/lib/booking-store'

type TabType = 'active' | 'completed' | 'cancelled'

export default function HistoryPage() {
  const { user, openAuthModal } = useAuth()
  const [tab, setTab] = useState<TabType>('active')
  const [bookings, setBookings] = useState<BookingRecord[]>([])
  const [loading, setLoading] = useState(true)
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

  // Fetch strictly authenticated user bookings from backend API (Anti-IDOR)
  const fetchUserBookings = useCallback(async () => {
    if (!user) {
      setBookings([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/bookings?userId=${encodeURIComponent(user.id)}`, {
        headers: {
          'x-user-id': user.id,
        },
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Gagal memuat riwayat booking.')
      }

      setBookings(data.bookings || [])
    } catch (err: any) {
      setError(err.message || 'Terjadi kendala saat mengambil tiket.')
      setBookings([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchUserBookings()
  }, [fetchUserBookings])

  // Handle Cancel Booking strictly for owned ticket
  const handleCancelBooking = async (idOrCode: string) => {
    if (!user) return
    setCancelLoading(true)

    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(idOrCode)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({ action: 'cancel' }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal membatalkan booking.')
      }

      // Update state locally
      setBookings(prev =>
        prev.map(b =>
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

  // Segment user's bookings by tab
  const activeList = bookings.filter(
    b => b.status === 'CONFIRMED' || b.status === 'PAID' || b.status === 'PENDING_PAYMENT'
  )
  const completedList = bookings.filter(b => (b.status as string) === 'COMPLETED')
  const cancelledList = bookings.filter(b => b.status === 'CANCELLED')

  const currentList =
    tab === 'active' ? activeList : tab === 'completed' ? completedList : cancelledList

  return (
    <div className="min-h-screen bg-surface pb-20">
      <main className="max-w-4xl mx-auto px-3.5 sm:px-8 py-3.5 sm:py-8">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="mb-4 sm:mb-5 p-3 sm:p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs sm:text-sm font-medium flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <Check size={16} className="text-emerald-600 flex-shrink-0" />
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
        <div className="mb-3.5 sm:mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-2.5 sm:gap-3">
          <div>
            <h1 className="text-xl sm:text-3xl font-black text-ink tracking-tight">
              Riwayat booking
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-0.5">
              {user
                ? `Tiket perjalanan terdaftar untuk akun ${user.name} (${user.email}).`
                : 'Kelola e-tiket dan perjalanan bus antarkota Anda.'}
            </p>
          </div>

          {user && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold w-fit">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Akses Privat & Terlindungi (Anti-IDOR)</span>
            </div>
          )}
        </div>

        {/* ── UNATHENTICATED STATE: ZERO TICKET LEAKAGE GUARANTEE ── */}
        {!user ? (
          <div className="bg-white border border-borderCol rounded-2xl p-4 sm:p-10 text-center shadow-xs space-y-3.5 sm:space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-primary-tint flex items-center justify-center mx-auto text-primary">
              <ShieldCheck size={32} />
            </div>

            <div className="max-w-md mx-auto space-y-1.5">
              <h2 className="text-lg sm:text-xl font-black text-ink">
                Riwayat Booking Bersifat Privat
              </h2>
              <p className="text-xs sm:text-sm text-muted leading-relaxed">
                Untuk melindungi privasi tiket Anda dan mencegah kebocoran data, tiket hanya dapat
                dilihat oleh pemilik akun yang sah.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => openAuthModal({ mode: 'login' })}
                className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold text-xs sm:text-sm rounded-full shadow-xs transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <UserIcon size={16} />
                <span>Masuk ke Akun Anda</span>
              </button>
            </div>
          </div>
        ) : (
          /* ── AUTHENTICATED STATE: DISPLAY USER'S REAL TICKETS ONLY ── */
          <>
            {/* Tabs */}
            <div className="flex items-center gap-2 mb-3.5 sm:mb-6 overflow-x-auto pb-1 no-scrollbar">
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

              <button
                type="button"
                onClick={fetchUserBookings}
                title="Segarkan riwayat tiket"
                className="ml-auto p-2 rounded-full border border-borderCol bg-white hover:bg-surface text-muted hover:text-ink transition-colors cursor-pointer"
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
                  className="font-bold underline ml-2"
                >
                  Coba lagi
                </button>
              </div>
            )}

            {/* Loading Skeleton */}
            {loading ? (
              <div className="space-y-4">
                {[1, 2].map(i => (
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
                      ? 'Anda belum memiliki tiket bus yang aktif. Pesan tiket perjalanan Anda sekarang.'
                      : 'Tiket riwayat perjalanan Anda akan tercatat di sini secara otomatis.'}
                  </p>
                </div>
                {tab === 'active' && (
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary-dark text-white rounded-full text-xs font-bold shadow-2xs transition-colors"
                  >
                    <span>Cari Tiket Bus</span>
                    <ArrowRight size={14} />
                  </Link>
                )}
              </div>
            ) : (
              /* Ticket List */
              <div className="space-y-4">
                {currentList.map(booking => {
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
                            Kursi Anda ditahan sementara. Selesaikan pembayaran agar pesanan tidak dilepas.
                          </span>
                          <span className="text-[11px] font-bold">Khusus Akun Anda</span>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2.5 pt-1">
                        {isPaid && (
                          <>
                            <Link
                              href={`/booking/${booking.scheduleId}/eticket?code=${booking.bookingCode}&seats=${encodeURIComponent(
                                booking.seats
                              )}&from=${encodeURIComponent(booking.from)}&to=${encodeURIComponent(
                                booking.to
                              )}&bus=${encodeURIComponent(booking.bus)}&cls=${encodeURIComponent(
                                booking.cls
                              )}&total=${booking.totalAmount}`}
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

                        {tab === 'completed' && (
                          <Link
                            href="/"
                            className="inline-block px-4 py-2 border border-primary text-primary hover:bg-primary-tint/30 rounded-input text-xs font-bold transition-all"
                          >
                            Pesan lagi rute ini
                          </Link>
                        )}

                        {isCancelled && (
                          <span className="text-[11px] text-muted font-medium">
                            Tiket ini dibatalkan secara aman dan tidak dapat digunakan.
                          </span>
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
