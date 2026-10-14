'use client'

import { use, Suspense } from 'react'
import Link from 'next/link'
import Stepper from '@/components/Stepper'
import { Check, CheckCircle2 } from 'lucide-react'

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
  const dateStr = sp.date ?? 'Sabtu, 10 Okt 2026'
  const bookingCode = 'RK-7Q4M2X'
  const email = sp.email ?? 'dini@contoh.id'

  return (
    <div className="min-h-screen bg-surface pb-20">
      <Stepper currentStep={6} />

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
        {/* Top Success Banner (Matches Image 2) */}
        <div className="mb-6 p-4 sm:p-5 rounded-card bg-[#EDFDF2] border border-[#A6F4C5] flex items-start gap-3.5 shadow-2xs">
          <div className="w-8 h-8 rounded-full bg-[#12B76A] text-white flex items-center justify-center flex-shrink-0 mt-0.5">
            <Check size={18} strokeWidth={3} />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-[#027A48]">
              Pembayaran berhasil. Kursi 5A dan 5B resmi milikmu.
            </h1>
            <p className="text-xs sm:text-sm text-[#027A48]/80 mt-0.5">
              E-tiket juga sudah dikirim ke {email} dan WhatsApp.
            </p>
          </div>
        </div>

        {/* Content Layout */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Left: Ticket Card */}
          <div className="flex-1 w-full bg-white border border-borderCol rounded-card p-6 sm:p-7 shadow-2xs">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_220px] gap-6 items-center">
              {/* Left Details */}
              <div className="space-y-6">
                {/* Kode Booking & Badge */}
                <div>
                  <span className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
                    KODE BOOKING
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl sm:text-3xl font-black text-ink font-mono tracking-tight">
                      {bookingCode}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-50 text-success border border-green-200 text-xs font-bold">
                      <Check size={12} strokeWidth={3} /> Terbayar
                    </span>
                  </div>
                </div>

                {/* Route & Times */}
                <div className="flex items-center gap-4 max-w-sm">
                  <div>
                    <span className="text-2xl font-black text-ink">08:00</span>
                    <span className="block text-xs text-muted mt-0.5">{from}</span>
                  </div>

                  <div className="flex-1 flex flex-col items-center px-2">
                    <span className="text-[11px] text-muted font-medium mb-1">3j 30m</span>
                    <div className="w-full h-px bg-borderCol relative flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-borderCol absolute -left-1" />
                      <div className="w-2 h-2 rounded-full bg-borderCol absolute -right-1" />
                    </div>
                  </div>

                  <div>
                    <span className="text-2xl font-black text-ink">11:30</span>
                    <span className="block text-xs text-muted mt-0.5">{to}</span>
                  </div>
                </div>

                {/* Tanggal & Bus */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="block text-muted font-semibold uppercase tracking-wider text-[10px] mb-0.5">
                      TANGGAL
                    </span>
                    <span className="font-bold text-ink text-sm">{dateStr}</span>
                  </div>
                  <div>
                    <span className="block text-muted font-semibold uppercase tracking-wider text-[10px] mb-0.5">
                      BUS
                    </span>
                    <span className="font-bold text-ink text-sm">Nusa Trans · Executive 2–2</span>
                  </div>
                </div>

                {/* Passenger list */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-3 p-3 bg-surface border border-borderCol/60 rounded-xl">
                    <span className="px-2.5 py-1 rounded-md bg-primary-tint text-primary border border-primary/30 text-xs font-bold font-mono">
                      5A
                    </span>
                    <span className="text-sm font-bold text-ink">Dini Sartika</span>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-surface border border-borderCol/60 rounded-xl">
                    <span className="px-2.5 py-1 rounded-md bg-primary-tint text-primary border border-primary/30 text-xs font-bold font-mono">
                      5B
                    </span>
                    <span className="text-sm font-bold text-ink">Rina Putri</span>
                  </div>
                </div>
              </div>

              {/* Dashed vertical separator */}
              <div className="hidden md:block w-px h-full border-r border-dashed border-borderCol my-2" />

              {/* Right: QR Code */}
              <div className="flex flex-col items-center justify-center text-center p-2">
                <div className="p-3 bg-white border border-borderCol rounded-xl shadow-2xs mb-3">
                  <svg width="140" height="140" viewBox="0 0 100 100" fill="none">
                    <rect width="100" height="100" fill="white" />
                    {/* Top-Left Finder */}
                    <rect x="8" y="8" width="28" height="28" rx="3" fill="#0F2A33" />
                    <rect x="14" y="14" width="16" height="16" rx="1.5" fill="white" />
                    <rect x="18" y="18" width="8" height="8" rx="1" fill="#0B6E78" />
                    {/* Top-Right Finder */}
                    <rect x="64" y="8" width="28" height="28" rx="3" fill="#0F2A33" />
                    <rect x="70" y="14" width="16" height="16" rx="1.5" fill="white" />
                    <rect x="74" y="18" width="8" height="8" rx="1" fill="#0B6E78" />
                    {/* Bottom-Left Finder */}
                    <rect x="8" y="64" width="28" height="28" rx="3" fill="#0F2A33" />
                    <rect x="14" y="70" width="16" height="16" rx="1.5" fill="white" />
                    <rect x="18" y="74" width="8" height="8" rx="1" fill="#0B6E78" />
                    {/* Data Pattern */}
                    <rect x="42" y="12" width="8" height="8" fill="#0F2A33" />
                    <rect x="46" y="24" width="8" height="14" fill="#0B6E78" />
                    <rect x="12" y="44" width="10" height="8" fill="#0F2A33" />
                    <rect x="28" y="46" width="8" height="8" fill="#0F2A33" />
                    <rect x="40" y="42" width="18" height="18" rx="2" fill="#0F2A33" />
                    <rect x="45" y="47" width="8" height="8" fill="white" />
                    <rect x="66" y="44" width="8" height="12" fill="#0B6E78" />
                    <rect x="78" y="42" width="12" height="8" fill="#0F2A33" />
                    <rect x="42" y="66" width="10" height="8" fill="#0F2A33" />
                    <rect x="48" y="78" width="8" height="12" fill="#0B6E78" />
                    <rect x="66" y="68" width="14" height="8" fill="#0F2A33" />
                    <rect x="82" y="72" width="8" height="18" fill="#0F2A33" />
                  </svg>
                </div>
                <p className="text-[11px] text-muted max-w-[180px] leading-tight">
                  Tunjukkan QR ini ke petugas saat naik. Contoh tampilan.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Langkah Berikutnya Card */}
          <div className="w-full lg:w-80 flex-shrink-0 bg-white border border-borderCol rounded-card p-6 shadow-2xs space-y-5">
            <h2 className="text-base font-bold text-ink">Langkah berikutnya</h2>

            <div className="space-y-4 text-xs text-ink leading-relaxed">
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-primary-tint text-primary font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                  1
                </span>
                <p>
                  Datang <strong className="font-bold">30 menit</strong> sebelum berangkat di [TITIK KUMPUL / TERMINAL].
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-primary-tint text-primary font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                  2
                </span>
                <p>
                  Bawa <strong className="font-bold">KTP</strong> sesuai data penumpang.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-primary-tint text-primary font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                  3
                </span>
                <p>
                  Tunjukkan QR atau kode <strong className="font-bold">{bookingCode}</strong> ke petugas.
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full py-2.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-input text-sm transition-colors shadow-sm"
              >
                Unduh e-tiket (PDF)
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="py-2 px-3 border border-borderCol hover:border-primary text-ink hover:text-primary rounded-input text-xs font-bold transition-all bg-white"
                >
                  Bagikan
                </button>
                <button
                  type="button"
                  className="py-2 px-3 border border-borderCol hover:border-primary text-ink hover:text-primary rounded-input text-xs font-bold transition-all bg-white"
                >
                  Tambah ke kalender
                </button>
              </div>

              <div className="text-center pt-2">
                <Link
                  href="/history"
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Lihat di riwayat booking
                </Link>
              </div>
            </div>
          </div>
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
