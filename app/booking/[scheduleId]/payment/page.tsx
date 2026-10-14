'use client'

import { use, useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Stepper from '@/components/Stepper'
import { ArrowLeft, Check, ShieldCheck, QrCode, CreditCard, Building2, Smartphone } from 'lucide-react'

const PAYMENT_METHODS = [
  {
    id: 'bca_va',
    name: 'BCA Virtual Account',
    desc: 'Verifikasi instan otomatis, tanpa upload bukti bayar',
    badge: 'Populer',
    icon: Building2,
  },
  {
    id: 'mandiri_va',
    name: 'Mandiri Virtual Account',
    desc: 'Verifikasi instan otomatis',
    icon: Building2,
  },
  {
    id: 'qris',
    name: 'QRIS (Semua E-Wallet & M-Banking)',
    desc: 'Scan cepat via GoPay, OVO, DANA, ShopeePay, BCA, dll.',
    badge: 'Instan',
    icon: QrCode,
  },
  {
    id: 'ewallet',
    name: 'GoPay / OVO',
    desc: 'Bayar langsung melalui aplikasi e-wallet kamu',
    icon: Smartphone,
  },
  {
    id: 'credit_card',
    name: 'Kartu Kredit / Debit Online',
    desc: 'Visa, Mastercard, JCB dengan 3D Secure',
    icon: CreditCard,
  },
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
  const seatsParam = sp.seats ?? '5A,5B'
  const seatsList = seatsParam.split(',').filter(Boolean)
  const email = sp.email ?? 'dini@contoh.id'
  const phone = sp.phone ?? '0812-3456-7890'
  const total = sp.total ?? '250000'

  const router = useRouter()
  const [selectedMethod, setSelectedMethod] = useState('bca_va')
  const [isProcessing, setIsProcessing] = useState(false)

  // Timer countdown
  const [timeLeft, setTimeLeft] = useState(340) // ~05:40

  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(t)
  }, [])

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const handlePay = () => {
    setIsProcessing(true)
    setTimeout(() => {
      router.push(
        `/booking/${scheduleId}/eticket?seats=${seatsParam}&from=${from}&to=${to}&date=${encodeURIComponent(
          dateStr
        )}&passengersData=${encodeURIComponent(sp.passengersData ?? '')}&email=${encodeURIComponent(
          email
        )}&phone=${encodeURIComponent(phone)}&method=${selectedMethod}&total=${total}`
      )
    }, 900)
  }

  return (
    <div className="min-h-screen bg-surface pb-20">
      <Stepper currentStep={5} />

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            Pilih metode pembayaran
          </h1>
          <p className="text-sm text-muted mt-1">
            Selesaikan pembayaran sebelum batas waktu berakhir untuk mengamankan kursi Anda.
          </p>
        </div>

        {/* Content Layout */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Left Column: Payment Options */}
          <div className="flex-1 w-full space-y-4">
            <div className="bg-white border border-borderCol rounded-card p-5 sm:p-6 shadow-2xs space-y-3">
              <h2 className="text-base font-bold text-ink mb-3">Metode yang Tersedia</h2>

              {PAYMENT_METHODS.map(method => {
                const Icon = method.icon
                const isSelected = selectedMethod === method.id

                return (
                  <div
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary bg-primary-tint/30 shadow-xs'
                        : 'border-borderCol hover:border-primary/50 bg-white'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 flex-shrink-0 transition-colors ${
                        isSelected ? 'border-primary bg-primary text-white' : 'border-borderCol bg-white'
                      }`}
                    >
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </div>

                    <div className="w-9 h-9 rounded-lg bg-surface border border-borderCol/60 flex items-center justify-center text-primary flex-shrink-0">
                      <Icon size={18} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-ink">{method.name}</span>
                        {method.badge && (
                          <span className="px-2 py-0.5 rounded-full bg-green-50 text-success border border-green-200 text-[10px] font-bold">
                            {method.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted mt-0.5">{method.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Guarantee Note */}
            <div className="p-4 bg-white border border-borderCol rounded-card flex items-center gap-3 text-xs text-muted">
              <ShieldCheck size={20} className="text-success flex-shrink-0" />
              <span>
                Transaksi dijamin 100% aman dengan enkripsi bank-grade 256-bit SSL. E-tiket akan diterbitkan secara instan setelah pembayaran terverifikasi.
              </span>
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
                disabled={isProcessing}
                onClick={handlePay}
                className="px-8 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-bold rounded-input transition-colors shadow-sm flex items-center gap-2"
              >
                {isProcessing ? 'Memproses...' : 'Bayar Sekarang'}
              </button>
            </div>
          </div>

          {/* Right Column: Timer & Summary */}
          <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
            {/* Timer Box */}
            <div className="bg-primary-tint/50 border border-primary/20 rounded-card p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted">Sisa waktu bayar</span>
                <span className="text-2xl sm:text-3xl font-mono font-extrabold text-ink tracking-tight">
                  {fmtTime(timeLeft)}
                </span>
              </div>
            </div>

            {/* Summary Box */}
            <div className="bg-white border border-borderCol rounded-card p-5 shadow-2xs space-y-4">
              <div>
                <h3 className="font-extrabold text-ink text-base">
                  {from} → {to}
                </h3>
                <p className="text-xs text-muted mt-1">
                  {dateStr} · 08:00 – 11:30
                </p>
                <p className="text-xs text-muted">Kursi {seatsList.join(', ')} · {seatsList.length} penumpang</p>
              </div>

              <div className="pt-3 border-t border-borderCol space-y-2">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>Total tagihan</span>
                  <span className="font-bold text-ink">
                    Rp {parseInt(total).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-base font-extrabold text-ink pt-1">
                  <span>Harus Dibayar</span>
                  <span className="text-xl text-primary font-black">
                    Rp {parseInt(total).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
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
