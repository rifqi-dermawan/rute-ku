'use client'

import { use, useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import QRCode from 'react-qr-code'
import Stepper from '@/components/Stepper'
import { Check, CheckCircle2, FileText, Printer, X, ShieldCheck } from 'lucide-react'

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
    dep?: string
    arr?: string
    dur?: string
    bus?: string
    cls?: string
    price?: string
    code?: string
  }>
}) {
  const { scheduleId } = use(params)
  const sp = use(searchParams)

  const from = sp.from ?? 'Jakarta'
  const to = sp.to ?? 'Bandung'
  const dateStr = sp.date ?? 'Sabtu, 10 Okt 2026'
  const dep = sp.dep ?? '08:00'
  const arr = sp.arr ?? '11:30'
  const dur = sp.dur ?? '3j 30m'
  const bus = sp.bus ? decodeURIComponent(sp.bus) : 'Nusa Trans'
  const cls = sp.cls ? decodeURIComponent(sp.cls) : 'Executive 2–2'
  const bookingCode = sp.code ?? 'RK-7Q4M2X'
  const email = sp.email ?? ''

  // State for Invoice Modal & QR Code value
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [qrValue, setQrValue] = useState('')

  // Parse dynamic passengers
  interface PassengerData {
    seat: string
    name: string
    type?: string
    ktp?: string
  }

  const passengers: PassengerData[] = (() => {
    if (sp.passengersData) {
      try {
        let raw = sp.passengersData
        if (raw.includes('%')) {
          try { raw = decodeURIComponent(raw) } catch {}
        }
        if (raw.includes('%')) {
          try { raw = decodeURIComponent(raw) } catch {}
        }
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      } catch {}
    }
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('ruteku_passengers')
        if (stored) {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed) && parsed.length > 0) return parsed
        }
      } catch {}
    }
    const seatsList = (sp.seats ?? '5A,5B').split(',').filter(Boolean)
    return seatsList.map((seat, idx) => ({
      seat,
      name: `Penumpang ${idx + 1}`,
    }))
  })()

  // Setup dynamic QR value and invoice view
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // Set dynamic QR code value to open this invoice
        const currentUrl = new URL(window.location.href)
        currentUrl.searchParams.set('view', 'invoice')
        setQrValue(currentUrl.toString())

        // Check if query params ask to show invoice directly (e.g. from scan)
        const params = new URLSearchParams(window.location.search)
        if (params.get('view') === 'invoice' || params.get('invoice') === 'true') {
          setShowInvoiceModal(true)
        }
      } catch {}
    }
  }, [])

  return (
    <div className={`min-h-screen bg-surface pb-20 ${showInvoiceModal ? 'print:p-0 print:bg-white print:m-0' : ''}`}>
      <Stepper currentStep={6} />

      <main className="max-w-6xl mx-auto px-3.5 sm:px-8 py-3.5 sm:py-8 print:p-0 print:max-w-none print:w-full print:m-0">
        {/* Top Success Banner */}
        <div className="mb-3.5 sm:mb-6 p-3 sm:p-5 rounded-card bg-[#EDFDF2] dark:bg-[#063826]/70 border border-[#A6F4C5] dark:border-[#0B6E48] flex items-start gap-3.5 shadow-2xs print:hidden">
          <div className="w-8 h-8 rounded-full bg-[#12B76A] text-white flex items-center justify-center flex-shrink-0 mt-0.5">
            <Check size={18} strokeWidth={3} />
          </div>
          <div>
            <h1 className="text-sm sm:text-lg font-bold text-[#027A48] dark:text-[#6CE9A6]">
              Pembayaran berhasil. Kursi {passengers.map(p => p.seat).join(' dan ')} resmi milikmu.
            </h1>
            <p className="text-xs sm:text-sm text-[#027A48]/80 dark:text-[#A6F4C5] mt-0.5">
              E-tiket resmi telah dikirim ke {email || 'email Anda'}.
            </p>
          </div>
        </div>

        {/* Content Layout */}
        <div className={`flex flex-col lg:flex-row gap-3.5 sm:gap-6 items-start ${showInvoiceModal ? 'print:hidden' : ''}`}>
          {/* Left: Ticket Card */}
          <div className="flex-1 w-full bg-white border border-borderCol rounded-card p-3.5 sm:p-7 shadow-2xs print:border-slate-300 print:shadow-none print:p-6 print:rounded-xl">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_220px] gap-6 items-center">
              {/* Left Details */}
              <div className="space-y-3.5 sm:space-y-6">
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
                    <span className="text-2xl font-black text-ink">{dep}</span>
                    <span className="block text-xs text-muted mt-0.5">{from}</span>
                  </div>

                  <div className="flex-1 flex flex-col items-center px-2">
                    <span className="text-[11px] text-muted font-medium mb-1">{dur}</span>
                    <div className="w-full h-px bg-borderCol relative flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-borderCol absolute -left-1" />
                      <div className="w-2 h-2 rounded-full bg-borderCol absolute -right-1" />
                    </div>
                  </div>

                  <div>
                    <span className="text-2xl font-black text-ink">{arr}</span>
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
                    <span className="font-bold text-ink text-sm">{bus} · {cls}</span>
                  </div>
                </div>

                {/* Passenger list */}
                <div className="space-y-2 pt-2">
                  {passengers.map(p => (
                    <div
                      key={p.seat}
                      className="flex items-center justify-between gap-3 p-3 bg-surface border border-borderCol/60 rounded-xl"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-1 rounded-md bg-primary-tint text-primary border border-primary/30 text-xs font-bold font-mono">
                          {p.seat}
                        </span>
                        <span className="text-sm font-bold text-ink">{p.name || 'Penumpang'}</span>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          p.type === 'anak'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-primary-tint text-primary border border-primary/25'
                        }`}
                      >
                        {p.type === 'anak' ? 'Anak / Bayi' : 'Dewasa'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Perforation separators: horizontal on mobile, vertical on desktop */}
              <div className="block md:hidden w-full border-t border-dashed border-borderCol my-2" />
              <div className="hidden md:block w-px h-full border-r border-dashed border-borderCol my-2" />

              {/* Right: QR Code using react-qr-code */}
              <div className="flex flex-col items-center justify-center text-center p-2">
                <div className="p-3 bg-white border border-borderCol rounded-2xl shadow-2xs mb-2.5">
                  <QRCode
                    value={qrValue || `https://ruteku.vercel.app/booking/${scheduleId}/eticket`}
                    size={135}
                    style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                    viewBox="0 0 256 256"
                    fgColor="#0F2A33"
                    bgColor="#FFFFFF"
                  />
                </div>
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#027A48] bg-[#EDFDF2] px-2.5 py-0.5 rounded-full border border-[#A6F4C5]">
                    <CheckCircle2 size={12} /> Scan untuk Invoice
                  </span>
                  <p className="text-[11px] text-muted max-w-[190px] leading-tight">
                    Scan QR dengan kamera HP untuk menampilkan invoice resmi &amp; detail tiket.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowInvoiceModal(true)}
                    className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-dark hover:underline cursor-pointer"
                  >
                    <FileText size={13} />
                    <span>Buka Invoice Digital</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Langkah Berikutnya Card */}
          <div className="w-full lg:w-80 flex-shrink-0 bg-white border border-borderCol rounded-card p-3.5 sm:p-6 shadow-2xs space-y-3.5 sm:space-y-5 print:hidden">
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
                  Bawa <strong className="font-bold">KTP / NIK KK / KIA</strong> sesuai data penumpang.
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
                onClick={() => setShowInvoiceModal(true)}
                className="w-full py-2.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-input text-sm transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileText size={16} />
                <span>Lihat &amp; Cetak Invoice</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="w-full py-2.5 border border-primary text-primary hover:bg-primary-tint/30 font-bold rounded-input text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer size={16} />
                <span>Unduh / Cetak Tiket (PDF)</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="py-2 px-3 border border-borderCol hover:border-primary text-ink hover:text-primary rounded-input text-xs font-bold transition-all bg-white cursor-pointer"
                >
                  Bagikan
                </button>
                <button
                  type="button"
                  className="py-2 px-3 border border-borderCol hover:border-primary text-ink hover:text-primary rounded-input text-xs font-bold transition-all bg-white cursor-pointer"
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

        {/* Interactive Invoice Modal */}
        {showInvoiceModal && (
          <div 
            onClick={(e) => { if (e.target === e.currentTarget) setShowInvoiceModal(false) }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs overflow-y-auto print:static print:p-0 print:bg-transparent print:backdrop-blur-none print:overflow-visible print:block print:w-full print:m-0"
          >
            <div className="bg-white rounded-2xl max-w-lg w-full border border-borderCol shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200 print:max-w-xl print:w-full print:mx-auto print:my-0 print:border print:border-slate-300 print:shadow-none print:rounded-xl">
              {/* Invoice Header */}
              <div className="bg-ink p-5 text-white flex items-center justify-between print:bg-slate-900 print:text-white print:p-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-black text-white text-base">
                    R
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base tracking-tight leading-none">RuteKu</h3>
                    <p className="text-[11px] text-white/70 mt-0.5">Invoice Pembayaran Resmi</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-xs font-bold flex items-center gap-1 print:border-emerald-600 print:text-emerald-700 print:bg-emerald-50">
                    <CheckCircle2 size={13} /> LUNAS
                  </span>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer print:hidden flex items-center gap-1 text-xs font-bold bg-white/10"
                    title="Cetak Invoice"
                  >
                    <Printer size={15} />
                    <span className="hidden sm:inline">Cetak</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowInvoiceModal(false)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer print:hidden"
                    title="Tutup"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Invoice Body */}
              <div className="p-6 space-y-5 text-xs text-ink max-h-[75vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-6 print:text-black">
                {/* Meta Info Grid */}
                <div className="grid grid-cols-2 gap-3 p-3.5 bg-surface rounded-xl border border-borderCol/60 text-xs print:bg-slate-50 print:border-slate-200">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted block print:text-slate-500">No. Invoice</span>
                    <span className="font-mono font-bold text-ink print:text-black">INV-{bookingCode}-{scheduleId.toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted block print:text-slate-500">Kode Booking</span>
                    <span className="font-mono font-bold text-primary">{bookingCode}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted block print:text-slate-500">Waktu Transaksi</span>
                    <span className="font-medium text-ink print:text-black">{dateStr}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted block print:text-slate-500">Status Pembayaran</span>
                    <span className="font-bold text-emerald-600 flex items-center gap-1">
                      <ShieldCheck size={13} /> Terverifikasi
                    </span>
                  </div>
                </div>

                {/* Trip Summary */}
                <div>
                  <h4 className="font-bold text-xs text-muted uppercase tracking-wider mb-2 print:text-slate-600">Detail Perjalanan</h4>
                  <div className="p-3.5 border border-borderCol rounded-xl space-y-2 print:border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-ink print:text-black">{from} → {to}</span>
                      <span className="text-xs font-semibold text-primary">{bus}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted text-xs print:text-slate-600">
                      <span>{dateStr} · {dep} – {arr} WIB</span>
                      <span>{cls}</span>
                    </div>
                  </div>
                </div>

                {/* Passengers */}
                <div>
                  <h4 className="font-bold text-xs text-muted uppercase tracking-wider mb-2 print:text-slate-600">Daftar Penumpang</h4>
                  <div className="border border-borderCol rounded-xl overflow-hidden divide-y divide-borderCol/60 print:border-slate-200">
                    {passengers.map((p, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between bg-white">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2 py-0.5 rounded bg-primary-tint text-primary font-mono font-bold text-xs print:border print:border-primary/40">
                            {p.seat}
                          </span>
                          <span className="font-bold text-ink text-xs print:text-black">{p.name || `Penumpang ${idx + 1}`}</span>
                          {p.type === 'anak' && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 font-bold uppercase">
                              Anak
                            </span>
                          )}
                        </div>
                        <span className="text-muted text-[11px] font-mono print:text-slate-500">
                          {p.ktp && p.ktp.trim()
                            ? `NIK: ${p.ktp.slice(0, 6)}******`
                            : p.type === 'anak'
                            ? '-'
                            : 'Identitas Terverifikasi'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Billing Breakdown */}
                <div>
                  <h4 className="font-bold text-xs text-muted uppercase tracking-wider mb-2 print:text-slate-600">Rincian Pembayaran</h4>
                  <div className="space-y-1.5 p-3.5 bg-surface rounded-xl border border-borderCol/60 print:bg-slate-50 print:border-slate-200">
                    <div className="flex justify-between text-muted print:text-slate-700">
                      <span>Tiket Bus ({passengers.length} kursi)</span>
                      <span className="font-medium text-ink print:text-black">
                        Rp {(sp.total ? parseInt(sp.total) : 250000).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted print:text-slate-700">
                      <span>Biaya Layanan &amp; Asuransi Jasa Raharja</span>
                      <span className="font-medium text-emerald-600">Gratis (Rp 0)</span>
                    </div>
                    <div className="pt-2 border-t border-borderCol flex justify-between items-center text-sm font-black text-ink print:border-slate-200 print:text-black">
                      <span>Total Dibayar</span>
                      <span className="text-base text-primary">
                        Rp {(sp.total ? parseInt(sp.total) : 250000).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice Footer Actions (Disembunyikan saat dicetak sehingga kertas cetak/PDF bersih tanpa tombol aksi) */}
              <div className="p-4 bg-surface border-t border-borderCol flex items-center justify-between gap-3 print:hidden">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 border border-borderCol bg-white hover:bg-surface text-ink text-xs font-bold rounded-input flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer size={14} /> Cetak Invoice
                </button>
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-5 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-input transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
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
    dep?: string
    arr?: string
    dur?: string
    bus?: string
    cls?: string
    price?: string
  }>
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface p-8 text-center text-muted">Memuat e-tiket...</div>}>
      <ETicketContent {...props} />
    </Suspense>
  )
}
