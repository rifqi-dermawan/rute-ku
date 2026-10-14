'use client'

import { use, useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Stepper from '@/components/Stepper'
import { Check, ArrowLeft, ShieldCheck } from 'lucide-react'

interface PassengerData {
  seat: string
  name: string
  ktp: string
}

function ReviewContent({
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

  const router = useRouter()

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

  // Agreement checkbox
  const [agreed, setAgreed] = useState(false)

  // Timer countdown
  const [timeLeft, setTimeLeft] = useState(411) // 06:51

  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(t)
  }, [])

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const pricePerSeat = 125000
  const totalPrice = seatsList.length * pricePerSeat

  // Mask KTP for privacy: KTP •••• •••• •••• 0001
  const maskKtp = (ktp: string) => {
    const clean = ktp.replace(/\s+/g, '')
    const last4 = clean.slice(-4) || '0000'
    return `KTP •••• •••• •••• ${last4}`
  }

  const handleProceedPayment = () => {
    const encodedPassengers = encodeURIComponent(JSON.stringify(passengers))
    router.push(
      `/booking/${scheduleId}/payment?seats=${seatsParam}&from=${from}&to=${to}&date=${encodeURIComponent(
        dateStr
      )}&passengersData=${encodedPassengers}&email=${encodeURIComponent(email)}&phone=${encodeURIComponent(
        phone
      )}&total=${totalPrice}`
    )
  }

  return (
    <div className="min-h-screen bg-surface pb-20">
      <Stepper currentStep={4} />

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            Review &amp; konfirmasi
          </h1>
          <p className="text-sm text-muted mt-1">
            Cek sekali lagi. Tekan &quot;Ubah&quot; untuk memperbaiki bagian mana pun; data lain tidak hilang.
          </p>
        </div>

        {/* Content Layout */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Left Column: Review Cards */}
          <div className="flex-1 w-full space-y-5">
            {/* 1. Card Jadwal */}
            <div className="bg-white border border-borderCol rounded-card p-5 sm:p-6 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-ink">Jadwal</h2>
                <Link
                  href={`/booking/${scheduleId}/seat?from=${from}&to=${to}`}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Ubah
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-borderCol/50">
                <div>
                  <span className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
                    RUTE
                  </span>
                  <span className="text-sm font-bold text-ink">{from} → {to}</span>
                </div>
                <div>
                  <span className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
                    BERANGKAT
                  </span>
                  <span className="text-sm font-bold text-ink">{dateStr} · 08:00</span>
                </div>
                <div>
                  <span className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
                    TIBA
                  </span>
                  <span className="text-sm font-bold text-ink">11:30</span>
                </div>
              </div>

              <div className="pt-3">
                <span className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
                  BUS
                </span>
                <span className="text-sm font-bold text-ink">Nusa Trans · Executive 2–2</span>
              </div>
            </div>

            {/* 2. Card Kursi & Penumpang */}
            <div className="bg-white border border-borderCol rounded-card p-5 sm:p-6 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-ink">Kursi &amp; penumpang</h2>
                <Link
                  href={`/booking/${scheduleId}/passenger?seats=${seatsParam}&from=${from}&to=${to}`}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Ubah
                </Link>
              </div>

              <div className="space-y-3">
                {passengers.map(p => (
                  <div
                    key={p.seat}
                    className="flex items-center gap-3 p-3 bg-surface border border-borderCol/60 rounded-xl"
                  >
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary-tint text-primary border border-primary/30 text-xs font-bold font-mono">
                      <Check size={12} strokeWidth={3} />
                      <span>{p.seat}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-ink">{p.name || 'Penumpang'}</p>
                      <p className="text-xs text-muted font-mono tracking-wide">{maskKtp(p.ktp)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted mt-4">
                E-tiket dikirim ke <span className="font-semibold text-ink">{email}</span> dan WhatsApp{' '}
                <span className="font-semibold text-ink">{phone}</span>.
              </p>
            </div>

            {/* 3. Card Rincian Harga */}
            <div className="bg-white border border-borderCol rounded-card p-5 sm:p-6 shadow-2xs">
              <h2 className="text-base font-bold text-ink mb-4">Rincian harga</h2>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-sm text-ink">
                  <span>Tiket {seatsList.length} x Rp {pricePerSeat.toLocaleString('id-ID')}</span>
                  <span className="font-semibold">Rp {totalPrice.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-ink">
                  <span>Biaya layanan</span>
                  <span className="font-bold text-success">Gratis</span>
                </div>
                <div className="pt-3 border-t border-borderCol flex items-center justify-between">
                  <span className="text-base font-bold text-ink">Total bayar</span>
                  <span className="text-2xl font-black text-ink">
                    Rp {totalPrice.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Card Aturan Pembatalan */}
            <div className="bg-white border border-borderCol rounded-card p-5 sm:p-6 shadow-2xs">
              <h2 className="text-base font-bold text-ink mb-3">Aturan pembatalan</h2>
              <div className="space-y-1.5 text-xs text-muted leading-relaxed">
                <p>Lebih dari 24 jam sebelum berangkat: refund 90%</p>
                <p>2–24 jam sebelum berangkat: refund 50%</p>
                <p>Kurang dari 2 jam: tidak ada refund</p>
              </div>

              <label className="flex items-start gap-2.5 mt-5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-borderCol text-primary accent-primary cursor-pointer"
                />
                <span className="text-xs sm:text-sm text-ink font-medium">
                  Saya sudah membaca dan setuju dengan syarat &amp; aturan pembatalan
                </span>
              </label>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-5 py-2.5 border border-primary text-primary hover:bg-primary-tint/30 text-sm font-bold rounded-input flex items-center gap-2 transition-all"
              >
                <ArrowLeft size={16} />
                <span>Kembali ke data penumpang</span>
              </button>

              <button
                type="button"
                disabled={!agreed}
                onClick={handleProceedPayment}
                className="px-7 py-2.5 bg-primary hover:bg-primary-dark disabled:bg-borderCol disabled:text-muted disabled:cursor-not-allowed text-white text-sm font-bold rounded-input transition-all shadow-sm"
              >
                Konfirmasi &amp; lanjut bayar
              </button>
            </div>
          </div>

          {/* Right Column: Timer & Note */}
          <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
            {/* Timer Box */}
            <div className="bg-primary-tint/50 border border-primary/20 rounded-card p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted">Sisa waktu tahan kursi</span>
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

              <div className="pt-3 border-t border-borderCol flex items-center justify-between">
                <span className="text-sm font-bold text-ink">Total</span>
                <span className="text-xl font-black text-ink">
                  Rp {totalPrice.toLocaleString('id-ID')}
                </span>
              </div>

              {/* Informational Note */}
              <div className="p-3 bg-primary-tint/60 rounded-xl border border-primary/15 text-xs text-ink leading-relaxed flex items-start gap-2">
                <ShieldCheck size={16} className="text-primary flex-shrink-0 mt-0.5" />
                <span>
                  Kursi baru menjadi milikmu setelah pembayaran berhasil. Sampai saat itu, kursi hanya ditahan.
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function ReviewPage(props: {
  params: Promise<{ scheduleId: string }>
  searchParams: Promise<{
    seats?: string
    from?: string
    to?: string
    date?: string
    passengersData?: string
    email?: string
    phone?: string
  }>
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface p-8 text-center text-muted">Memuat konfirmasi...</div>}>
      <ReviewContent {...props} />
    </Suspense>
  )
}
