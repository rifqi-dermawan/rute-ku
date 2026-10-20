'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Check, Clock, AlertCircle } from 'lucide-react'

type TabType = 'active' | 'completed' | 'cancelled'

const BOOKINGS = {
  active: [
    {
      id: 'RK-7Q4M2X',
      scheduleId: 'sch-002',
      from: 'Jakarta',
      to: 'Bandung',
      date: 'Sab, 10 Okt 2026 · 08:00',
      seats: '5A, 5B',
      passengers: 'Penumpang 1, Penumpang 2',
      price: 250000,
      status: 'paid',
    },
    {
      id: 'RK-4D8N1P',
      scheduleId: 'sch-004',
      from: 'Surabaya',
      to: 'Malang',
      date: 'Minggu, 18 Okt 2026 · 06:30',
      seats: '3C',
      passengers: 'Penumpang 1',
      price: 70000,
      status: 'waiting',
      holdUntil: '16:41',
    },
  ],
  completed: [
    {
      id: 'RK-1B99AA',
      scheduleId: 'sch-001',
      from: 'Jakarta',
      to: 'Bandung',
      date: 'Kamis, 1 Okt 2026 · 05:30',
      seats: '2A',
      passengers: 'Penumpang 1',
      price: 105000,
      status: 'completed',
    },
  ],
  cancelled: [
    {
      id: 'RK-8800CC',
      scheduleId: 'sch-005',
      from: 'Bandung',
      to: 'Yogyakarta',
      date: 'Jumat, 25 Sep 2026 · 19:00',
      seats: '1A',
      passengers: 'Penumpang 1',
      price: 180000,
      status: 'cancelled',
    },
  ],
}

export default function HistoryPage() {
  const [tab, setTab] = useState<TabType>('active')
  const [activeList, setActiveList] = useState(BOOKINGS.active)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('ruteku_last_booking')
        if (stored) {
          const item = JSON.parse(stored)
          setActiveList(prev => {
            const index = prev.findIndex(b => b.id === item.id)
            if (index !== -1) {
              const updated = [...prev]
              updated[index] = { ...updated[index], ...item }
              return updated
            }
            return [item, ...prev]
          })
        }
      } catch {}
    }
  }, [])

  const handleCancelBooking = (id: string) => {
    setActiveList(prev => prev.filter(b => b.id !== id))
    setCancellingId(null)
  }

  return (
    <div className="min-h-screen bg-surface pb-20">
      <main className="max-w-4xl mx-auto px-3.5 sm:px-8 py-5 sm:py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-3xl font-black text-ink tracking-tight">
            Riwayat booking
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-0.5">
            Lihat e-tiket, pesan lagi, atau batalkan booking yang belum berangkat.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setTab('active')}
            className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
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
            className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
              tab === 'completed'
                ? 'bg-primary text-white shadow-xs'
                : 'border border-borderCol bg-white text-ink hover:border-primary'
            }`}
          >
            Selesai (1)
          </button>

          <button
            type="button"
            onClick={() => setTab('cancelled')}
            className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
              tab === 'cancelled'
                ? 'bg-primary text-white shadow-xs'
                : 'border border-borderCol bg-white text-ink hover:border-primary'
            }`}
          >
            Dibatalkan (1)
          </button>
        </div>

        {/* Booking Card List */}
        <div className="space-y-4">
          {tab === 'active' &&
            activeList.map(booking => (
              <div
                key={booking.id}
                className="bg-white border border-borderCol rounded-card p-5 sm:p-6 shadow-2xs space-y-4"
              >
                {/* Top Row */}
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-ink">
                      {booking.from} → {booking.to}
                    </h2>
                    <p className="text-xs text-muted mt-1 font-medium">
                      {booking.date} · Kursi <strong className="text-ink">{booking.seats}</strong>
                      {booking.passengers && (
                        <span> · Penumpang: <strong className="text-ink">{booking.passengers}</strong></span>
                      )}
                      <span> · {booking.id}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {booking.status === 'paid' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-50 text-success border border-green-200 text-xs font-bold">
                        <Check size={12} strokeWidth={3} /> Terbayar
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-info/10 text-info border border-info/30 text-xs font-bold">
                        <Clock size={12} /> Menunggu bayar
                      </span>
                    )}

                    <span className="text-base sm:text-lg font-black text-ink">
                      Rp {booking.price.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                {/* Waiting warning banner */}
                {booking.holdUntil && (
                  <div className="p-3 rounded-xl bg-[#FEF6EE] border border-[#F9DBAF] text-[#93370D] text-xs">
                    Kursi ditahan sampai {booking.holdUntil}. Selesaikan pembayaran agar tidak dilepas.
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2.5 pt-1">
                  {booking.status === 'paid' ? (
                    <>
                      <Link
                        href={`/booking/${booking.scheduleId}/eticket?seats=${booking.seats}&from=${booking.from}&to=${booking.to}`}
                        className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-input text-xs font-bold shadow-2xs transition-colors"
                      >
                        Lihat e-tiket
                      </Link>

                      <button
                        type="button"
                        onClick={() => setCancellingId(booking.id)}
                        className="px-4 py-2 border border-[#FDA29B] text-[#B42318] hover:bg-red-50 rounded-input text-xs font-bold transition-colors"
                      >
                        Batalkan booking
                      </button>
                    </>
                  ) : (
                    <Link
                      href={`/booking/${booking.scheduleId}/payment?seats=${booking.seats}&from=${booking.from}&to=${booking.to}&total=${booking.price}`}
                      className="px-5 py-2 bg-primary hover:bg-primary-dark text-white rounded-input text-xs font-bold shadow-2xs transition-colors"
                    >
                      Lanjutkan pembayaran
                    </Link>
                  )}
                </div>
              </div>
            ))}

          {tab === 'completed' && (
            <div className="bg-white border border-borderCol rounded-card p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-base font-bold text-ink">Jakarta → Bandung</h2>
                  <p className="text-xs text-muted mt-1">Kamis, 1 Okt 2026 · 05:30 · Kursi 2A · RK-1B99AA</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-surface text-muted border border-borderCol text-xs font-bold">
                    Selesai
                  </span>
                  <span className="text-base font-bold text-ink">Rp 105.000</span>
                </div>
              </div>
              <Link
                href="/"
                className="inline-block px-4 py-2 border border-primary text-primary hover:bg-primary-tint/30 rounded-input text-xs font-bold transition-all"
              >
                Pesan lagi rute ini
              </Link>
            </div>
          )}

          {tab === 'cancelled' && (
            <div className="bg-white border border-borderCol rounded-card p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-base font-bold text-ink">Bandung → Yogyakarta</h2>
                  <p className="text-xs text-muted mt-1">Jumat, 25 Sep 2026 · 19:00 · Kursi 1A · RK-8800CC</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-error border border-red-200 text-xs font-bold">
                    Dibatalkan (Refund 90%)
                  </span>
                  <span className="text-base font-bold text-ink">Rp 180.000</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Cancel Confirmation Modal */}
      {cancellingId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-card border border-borderCol p-6 max-w-md w-full shadow-lg space-y-4">
            <div className="flex items-center gap-2 text-error">
              <AlertCircle size={22} />
              <h3 className="font-bold text-base text-ink">Konfirmasi Pembatalan</h3>
            </div>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              Apakah Anda yakin ingin membatalkan booking <strong className="text-ink">{cancellingId}</strong>?
              Sesuai aturan pembatalan (&gt; 24 jam sebelum berangkat), Anda berhak mendapatkan pengembalian dana 90%.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancellingId(null)}
                className="px-4 py-2 border border-borderCol rounded-input text-xs font-bold text-ink hover:bg-surface"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleCancelBooking(cancellingId)}
                className="px-4 py-2 bg-error hover:bg-red-700 text-white rounded-input text-xs font-bold shadow-xs"
              >
                Ya, Batalkan Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
