'use client'

import { use, useState, Suspense } from 'react'
import Link from 'next/link'
import Stepper from '@/components/Stepper'
import { Check, Download, Share2, Home, CheckCircle2, Copy } from 'lucide-react'

interface PassengerData {
  seat: string
  name: string
  ktp: string
}

function ETicketContent({
  params,
  searchParams,
}: {
  params: Promise<{ scheduleId: string }>
  searchParams: Promise<{
    seats?: string
    from?: string
    to?: string
    date?: string
    passengersData?: string
    email?: string
    phone?: string
    total?: string
  }>
}) {
  use(params)
  const sp = use(searchParams)

  const from = sp.from ?? 'Jakarta'
  const to = sp.to ?? 'Bandung'
  const dateStr = sp.date ?? 'Sab, 10 Okt 2026'
  const email = sp.email ?? 'dini@contoh.id'
  const bookingCode = 'RTK-892401'

  const [copied, setCopied] = useState(false)

  // Parse passengers
  const [passengers] = useState<PassengerData[]>(() => {
    if (sp.passengersData) {
      try {
        return JSON.parse(decodeURIComponent(sp.passengersData))
      } catch {
        // Fallback
      }
    }
    return [
      { seat: '5A', name: 'Dini Sartika', ktp: '3171020101990001' },
      { seat: '5B', name: 'Rina Putri',   ktp: '3171024500000002' },
    ]
  })

  const copyBookingCode = () => {
    navigator.clipboard.writeText(bookingCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-surface pb-20">
      <Stepper currentStep={6} />

      <main className="max-w-3xl mx-auto px-4 sm:px-8 py-8">
        {/* Success Banner */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-green-100 text-success flex items-center justify-center mx-auto mb-3 shadow-xs">
            <CheckCircle2 size={36} className="stroke-[2.5]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
            Pembayaran Berhasil &amp; Kursi Terkunci!
          </h1>
          <p className="text-sm text-muted mt-1.5 max-w-md mx-auto">
            E-tiket resmi telah diterbitkan dan dikirim ke{' '}
            <strong className="text-ink font-semibold">{email}</strong>.
          </p>
        </div>

        {/* E-Ticket Card */}
        <div className="bg-white border border-borderCol rounded-2xl overflow-hidden shadow-sm mb-6">
          {/* Ticket Header */}
          <div className="bg-primary text-white p-6 flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl font-black tracking-tight">RuteKu</span>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[11px] font-bold">
                  E-TIKET RESMI
                </span>
              </div>
              <p className="text-xs text-white/80">Nusa Trans · Executive 2–2</p>
            </div>

            <div className="text-right">
              <span className="block text-[10px] text-white/70 uppercase tracking-widest font-bold">
                KODE BOOKING
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xl font-mono font-black tracking-wider">{bookingCode}</span>
                <button
                  type="button"
                  onClick={copyBookingCode}
                  className="p-1 hover:bg-white/20 rounded transition-colors text-white/90"
                  title="Salin kode"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>

          {/* Ticket Body */}
          <div className="p-6 space-y-6">
            {/* Route & Times */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-6 border-b border-borderCol">
              <div>
                <span className="block text-xs font-semibold text-muted">Keberangkatan</span>
                <span className="text-lg font-bold text-ink">08:00</span>
                <span className="block text-xs text-ink font-medium mt-0.5">{from}</span>
                <span className="text-[11px] text-muted">Terminal Pulo Gebang</span>
              </div>

              <div>
                <span className="block text-xs font-semibold text-muted">Kedatangan (Est.)</span>
                <span className="text-lg font-bold text-ink">11:30</span>
                <span className="block text-xs text-ink font-medium mt-0.5">{to}</span>
                <span className="text-[11px] text-muted">Terminal Leuwi Panjang</span>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <span className="block text-xs font-semibold text-muted">Tanggal</span>
                <span className="text-sm font-bold text-ink mt-0.5 block">{dateStr}</span>
                <span className="inline-block mt-1.5 px-2 py-0.5 bg-green-50 text-success border border-green-200 rounded-md text-[11px] font-bold">
                  STATUS: LUNAS
                </span>
              </div>
            </div>

            {/* Passenger List */}
            <div>
              <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">
                Daftar Penumpang &amp; Kursi
              </h3>
              <div className="space-y-2.5">
                {passengers.map(p => (
                  <div
                    key={p.seat}
                    className="flex items-center justify-between p-3.5 bg-surface border border-borderCol/60 rounded-xl"
                  >
                    <div>
                      <p className="text-sm font-bold text-ink">{p.name || 'Penumpang'}</p>
                      <p className="text-xs text-muted font-mono mt-0.5">NIK: {p.ktp}</p>
                    </div>
                    <div className="px-3 py-1 bg-primary text-white font-mono font-bold text-sm rounded-lg shadow-xs">
                      Kursi {p.seat}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* QR Code Section */}
            <div className="pt-4 border-t border-borderCol flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-ink">Tunjukkan QR saat Boarding</h4>
                <p className="text-xs text-muted mt-1 max-w-sm">
                  Cukup tunjukkan kode QR ini langsung dari layar ponsel Anda kepada petugas bus saat naik.
                </p>
              </div>

              {/* QR Code visual */}
              <div className="p-3 bg-white border border-borderCol rounded-xl shadow-xs flex-shrink-0">
                <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
                  {/* Outer Frame */}
                  <rect width="100" height="100" fill="white" />
                  {/* Top-Left Finder */}
                  <rect x="10" y="10" width="28" height="28" rx="4" fill="#0F2A33" />
                  <rect x="16" y="16" width="16" height="16" rx="2" fill="white" />
                  <rect x="20" y="20" width="8" height="8" rx="1" fill="#0B6E78" />
                  {/* Top-Right Finder */}
                  <rect x="62" y="10" width="28" height="28" rx="4" fill="#0F2A33" />
                  <rect x="68" y="16" width="16" height="16" rx="2" fill="white" />
                  <rect x="72" y="20" width="8" height="8" rx="1" fill="#0B6E78" />
                  {/* Bottom-Left Finder */}
                  <rect x="10" y="62" width="28" height="28" rx="4" fill="#0F2A33" />
                  <rect x="16" y="68" width="16" height="16" rx="2" fill="white" />
                  <rect x="20" y="72" width="8" height="8" rx="1" fill="#0B6E78" />
                  {/* Data blocks */}
                  <rect x="44" y="14" width="8" height="8" fill="#0F2A33" />
                  <rect x="48" y="26" width="6" height="12" fill="#0B6E78" />
                  <rect x="14" y="44" width="10" height="6" fill="#0F2A33" />
                  <rect x="28" y="48" width="6" height="6" fill="#0F2A33" />
                  <rect x="42" y="42" width="16" height="16" rx="2" fill="#0F2A33" />
                  <rect x="46" y="46" width="8" height="8" fill="white" />
                  <rect x="64" y="46" width="8" height="12" fill="#0B6E78" />
                  <rect x="76" y="44" width="12" height="8" fill="#0F2A33" />
                  <rect x="44" y="64" width="10" height="8" fill="#0F2A33" />
                  <rect x="48" y="76" width="8" height="12" fill="#0B6E78" />
                  <rect x="64" y="68" width="12" height="8" fill="#0F2A33" />
                  <rect x="80" y="72" width="8" height="16" fill="#0F2A33" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="w-full sm:w-auto px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold text-sm rounded-input flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Download size={16} />
            <span>Unduh E-Tiket (PDF)</span>
          </button>

          <button
            type="button"
            onClick={copyBookingCode}
            className="w-full sm:w-auto px-6 py-2.5 border border-borderCol bg-white hover:bg-surface text-ink font-bold text-sm rounded-input flex items-center justify-center gap-2 transition-all"
          >
            <Share2 size={16} />
            <span>Bagikan Tiket</span>
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-2.5 border border-primary text-primary hover:bg-primary-tint/30 font-bold text-sm rounded-input flex items-center justify-center gap-2 transition-all"
          >
            <Home size={16} />
            <span>Kembali ke Beranda</span>
          </Link>
        </div>
      </main>
    </div>
  )
}

export default function ETicketPage(props: {
  params: Promise<{ scheduleId: string }>
  searchParams: Promise<{
    seats?: string
    from?: string
    to?: string
    date?: string
    passengersData?: string
    email?: string
    phone?: string
    total?: string
  }>
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface p-8 text-center text-muted">Memuat e-tiket...</div>}>
      <ETicketContent {...props} />
    </Suspense>
  )
}
