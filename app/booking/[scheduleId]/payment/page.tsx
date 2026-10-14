'use client'

import { use, useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Stepper from '@/components/Stepper'
import { ArrowLeft, Clock, Copy, Check, Info } from 'lucide-react'

const PAYMENT_METHODS = [
  { id: 'va', label: 'Virtual Account', sub: 'Bank Nusantara' },
  { id: 'ewallet', label: 'E-wallet', sub: 'Bayar lewat aplikasi' },
  { id: 'qris', label: 'QRIS', sub: 'Scan dari aplikasi apa pun' },
  { id: 'card', label: 'Kartu kredit / debit', sub: '' },
]

function PaymentContent({
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
  const { scheduleId } = use(params)
  const sp = use(searchParams)

  const from = sp.from ?? 'Jakarta'
  const to = sp.to ?? 'Bandung'
  const dateStr = sp.date ?? 'Sab, 10 Okt 2026'
  const seatsParam = sp.seats ?? '5A, 5B'
  const total = sp.total ?? '250000'

  const router = useRouter()
  const [selectedMethod, setSelectedMethod] = useState('va')
  const [copied, setCopied] = useState(false)
  const [isChecking, setIsChecking] = useState(false)

  // Countdown timer for Payment: 01:48 (108 seconds)
  const [secondsLeft, setSecondsLeft] = useState(108)

  useEffect(() => {
    const t = setInterval(() => {
      setSecondsLeft(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(t)
  }, [])

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const copyVA = () => {
    navigator.clipboard.writeText('8277081234567890')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleConfirmPaid = () => {
    setIsChecking(true)
    setTimeout(() => {
      router.push(
        `/booking/${scheduleId}/eticket?seats=${seatsParam}&from=${from}&to=${to}&date=${encodeURIComponent(
          dateStr
        )}&passengersData=${encodeURIComponent(sp.passengersData ?? '')}&email=${encodeURIComponent(
          sp.email ?? 'dini@contoh.id'
        )}&phone=${encodeURIComponent(sp.phone ?? '0812-3456-7890')}&total=${total}`
      )
    }, 700)
  }

  return (
    <div className="min-h-screen bg-surface pb-20">
      <Stepper currentStep={5} />

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
        {/* Title */}
        <div className="mb-5">
          <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
            Pembayaran
          </h1>
          <p className="text-sm text-muted mt-1">
            Selesaikan sebelum timer habis agar kursi {seatsParam} tidak dilepas.
          </p>
        </div>

        {/* Amber Alert Banner */}
        <div className="mb-6 p-4 rounded-xl bg-[#FEF6EE] border border-[#F9DBAF] text-[#93370D] flex items-start gap-3 shadow-2xs">
          <Clock size={18} className="text-[#93370D] flex-shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm leading-relaxed">
            <strong className="font-bold text-[#7A271A]">Waktu tinggal {fmtTime(secondsLeft).replace(':', ' menit ')} detik</strong>
            <p className="text-[#93370D] mt-0.5">
              Jika kamu sudah transfer saat timer habis, kursi tetap kami tahan sampai bank mengonfirmasi. Tidak perlu panik.
            </p>
          </div>
        </div>

        {/* Content Layout */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Left Column */}
          <div className="flex-1 w-full space-y-6">
            {/* Card 1: Pilih Metode Pembayaran */}
            <div className="bg-white border border-borderCol rounded-card p-5 sm:p-6 shadow-2xs">
              <h2 className="text-base font-bold text-ink mb-4">Pilih metode pembayaran</h2>
              <div className="space-y-2.5">
                {PAYMENT_METHODS.map(m => {
                  const isSel = selectedMethod === m.id
                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMethod(m.id)}
                      className={`flex items-center justify-between p-3.5 sm:p-4 rounded-xl border cursor-pointer transition-all ${
                        isSel
                          ? 'border-primary bg-primary-tint/40 shadow-xs ring-1 ring-primary/30'
                          : 'border-borderCol hover:border-primary/40 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                            isSel ? 'border-primary bg-primary' : 'border-borderCol bg-white'
                          }`}
                        >
                          {isSel && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <span className="font-bold text-sm text-ink">{m.label}</span>
                      </div>
                      {m.sub && (
                        <span className="text-xs text-muted font-medium">{m.sub}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Card 2: Transfer ke Virtual Account */}
            <div className="bg-white border border-borderCol rounded-card p-5 sm:p-6 shadow-2xs">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="text-base font-bold text-ink">Transfer ke Virtual Account</h2>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-info/10 text-info border border-info/30 text-xs font-semibold">
                  <Info size={13} />
                  <span>Menunggu pembayaran</span>
                </span>
              </div>

              {/* Virtual Account Box */}
              <div className="p-4 bg-surface border border-borderCol rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                  <span className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1">
                    NOMOR VIRTUAL ACCOUNT
                  </span>
                  <span className="text-xl sm:text-2xl font-mono font-bold text-ink tracking-wider">
                    8277 0812 3456 7890
                  </span>
                </div>

                <button
                  type="button"
                  onClick={copyVA}
                  className="px-4 py-2 border border-borderCol bg-white hover:border-primary hover:text-primary rounded-input text-xs font-bold text-ink flex items-center gap-1.5 self-start sm:self-auto transition-all shadow-2xs"
                >
                  {copied ? (
                    <>
                      <Check size={14} className="text-success" />
                      <span className="text-success">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Salin nomor</span>
                    </>
                  )}
                </button>
              </div>

              {/* Amount to pay */}
              <div className="flex items-center justify-between py-2 border-b border-borderCol/60 mb-4">
                <span className="text-xs sm:text-sm text-muted">Jumlah yang harus dibayar (pas)</span>
                <span className="text-xl sm:text-2xl font-extrabold text-ink">
                  Rp {parseInt(total).toLocaleString('id-ID')}
                </span>
              </div>

              {/* Step instructions */}
              <ol className="space-y-2 text-xs sm:text-sm text-ink leading-relaxed">
                <li className="flex gap-2">
                  <span className="font-bold text-muted">1.</span>
                  <span>Buka aplikasi bank atau ATM, pilih Transfer → Virtual Account.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-muted">2.</span>
                  <span>Masukkan nomor di atas, lalu cek nama tujuan &quot;RuteKu&quot;.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-muted">3.</span>
                  <span>Bayar tepat Rp 250.000. Status di halaman ini berubah otomatis (dicek tiap 5 detik).</span>
                </li>
              </ol>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-5 py-2.5 border border-primary text-primary hover:bg-primary-tint/30 text-sm font-bold rounded-input flex items-center gap-2 transition-all"
              >
                <ArrowLeft size={16} />
                <span>Kembali ke review</span>
              </button>

              <button
                type="button"
                disabled={isChecking}
                onClick={handleConfirmPaid}
                className="px-7 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-bold rounded-input transition-colors shadow-sm"
              >
                {isChecking ? 'Mengecek pembayaran...' : 'Saya sudah bayar, cek status'}
              </button>
            </div>
          </div>

          {/* Right Column */}
          <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
            {/* Amber Timer Card */}
            <div className="bg-[#FEF6EE] border border-[#F9DBAF] rounded-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#93370D]">Sisa waktu tahan</span>
                <span className="text-3xl font-mono font-extrabold text-[#7A271A] tracking-tight">
                  {fmtTime(secondsLeft)}
                </span>
              </div>
            </div>

            {/* Trip Summary Card */}
            <div className="bg-white border border-borderCol rounded-card p-5 shadow-2xs space-y-4">
              <div>
                <h3 className="font-black text-ink text-base">
                  {from} → {to}
                </h3>
                <p className="text-xs text-muted mt-1">
                  {dateStr} · 08:00 – 11:30
                </p>
                <p className="text-xs text-muted">Kursi {seatsParam} · Dini Sartika, Rina Putri</p>
              </div>

              <div className="pt-3 border-t border-borderCol flex items-center justify-between">
                <span className="text-sm font-bold text-ink">Total</span>
                <span className="text-xl font-black text-ink">
                  Rp {parseInt(total).toLocaleString('id-ID')}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMethod('ewallet')}
                className="w-full py-2.5 border border-borderCol hover:border-primary text-ink hover:text-primary text-xs font-bold rounded-input transition-colors bg-white shadow-2xs"
              >
                Ganti metode pembayaran
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function PaymentPage(props: {
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
    <Suspense fallback={<div className="min-h-screen bg-surface p-8 text-center text-muted">Memuat pembayaran...</div>}>
      <PaymentContent {...props} />
    </Suspense>
  )
}
