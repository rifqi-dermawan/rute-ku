'use client'

import { use, useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Stepper from '@/components/Stepper'
import { Check, AlertCircle, ArrowLeft } from 'lucide-react'

interface Passenger {
  seat: string
  name: string
  ktp: string
}

const SAVED_PASSENGERS = [
  { name: 'Dini Sartika', ktp: '3171020101990001', label: 'Dini Sartika (saya)' },
  { name: 'Rina Putri',   ktp: '3171020101990002', label: 'Rina Putri' },
]

function PassengerContent({
  params,
  searchParams,
}: {
  params: Promise<{ scheduleId: string }>
  searchParams: Promise<{
    seats?: string
    from?: string
    to?: string
    passengers?: string
    date?: string
  }>
}) {
  const { scheduleId } = use(params)
  const sp = use(searchParams)

  const from = sp.from ?? 'Jakarta'
  const to = sp.to ?? 'Bandung'
  const dateStr = sp.date ?? 'Sab, 10 Okt 2026'
  const seatsParam = sp.seats ?? '5A,5B'
  const seatsList = seatsParam.split(',').filter(Boolean)

  const router = useRouter()

  // Passenger state
  const [passengers, setPassengers] = useState<Passenger[]>(() => {
    return seatsList.map((seat, idx) => {
      if (idx === 0) {
        return { seat, name: 'Dini Sartika', ktp: '3171020101990001' }
      }
      if (idx === 1) {
        return { seat, name: 'Rina Putri', ktp: '31710245' } // Pre-populated to match mockup validation state
      }
      return { seat, name: '', ktp: '' }
    })
  })

  // Contact person state
  const [email, setEmail] = useState('dini@contoh.id')
  const [phone, setPhone] = useState('0812-3456-7890')
  const [savePassenger, setSavePassenger] = useState(true)

  // Auto-save timestamp state
  const [savedTime, setSavedTime] = useState('14:03')

  // Timer countdown
  const [timeLeft, setTimeLeft] = useState(494) // 08:14

  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(t)
  }, [])

  // Auto-save draft effect
  useEffect(() => {
    const now = new Date()
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    setSavedTime(`${hh}:${mm}`)
  }, [passengers, email, phone])

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const updatePassenger = (index: number, field: 'name' | 'ktp', value: string) => {
    setPassengers(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const applyFastFill = (index: number, person: typeof SAVED_PASSENGERS[0]) => {
    setPassengers(prev => {
      const next = [...prev]
      next[index] = { ...next[index], name: person.name, ktp: person.ktp }
      return next
    })
  }

  // Price calculations
  const pricePerSeat = 125000
  const totalPrice = seatsList.length * pricePerSeat

  const handleProceed = () => {
    const cleanPassengers = passengers.map(p => {
      const rawKtp = p.ktp.replace(/\s+/g, '')
      const ktp = rawKtp.length === 16 ? rawKtp : (rawKtp + '0000000000000000').slice(0, 16)
      return { ...p, ktp }
    })

    const encodedPassengers = encodeURIComponent(JSON.stringify(cleanPassengers))
    router.push(
      `/booking/${scheduleId}/review?seats=${seatsParam}&from=${from}&to=${to}&date=${encodeURIComponent(
        dateStr
      )}&passengersData=${encodedPassengers}&email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}`
    )
  }

  return (
    <div className="min-h-screen bg-surface pb-20">
      <Stepper currentStep={3} />

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
              Data penumpang
            </h1>
            <p className="text-sm text-muted mt-1">
              Satu formulir untuk tiap kursi. Isi sesuai KTP agar boarding lancar.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted font-medium self-start sm:self-auto">
            <Check size={14} className="text-success stroke-[2.5]" />
            <span>Draf tersimpan otomatis {savedTime}</span>
          </div>
        </div>

        {/* Content Layout */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Left Column: Passenger Cards & Contacts */}
          <div className="flex-1 w-full space-y-6">
            {passengers.map((passenger, index) => {
              const rawKtp = passenger.ktp.replace(/\s+/g, '')
              const digitsCount = rawKtp.replace(/\D/g, '').length
              const isKtpValid = /^\d{16}$/.test(rawKtp)
              const hasKtpError = passenger.ktp.length > 0 && !isKtpValid

              return (
                <div
                  key={passenger.seat}
                  className="bg-white border border-borderCol rounded-card p-5 sm:p-6 shadow-2xs"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between flex-wrap gap-3 pb-4 mb-5 border-b border-borderCol/50">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-ink text-base">
                        Penumpang {index + 1} · Kursi
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-purple-50 text-indigo-700 border border-indigo-200 text-xs font-bold font-mono">
                        {passenger.seat}
                      </span>
                    </div>

                    {/* Isi Cepat Buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted font-medium">Isi cepat:</span>
                      {SAVED_PASSENGERS.map(p => (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => applyFastFill(index, p)}
                          className="px-3 py-1 text-xs font-semibold rounded-full border border-borderCol hover:border-primary hover:text-primary hover:bg-primary-tint/30 transition-all text-ink"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Nama Lengkap */}
                    <div>
                      <label className="block text-xs font-bold text-ink mb-1.5">
                        Nama lengkap (sesuai KTP)
                      </label>
                      <input
                        type="text"
                        value={passenger.name}
                        onChange={e => updatePassenger(index, 'name', e.target.value)}
                        placeholder="Contoh: Dini Sartika"
                        className="w-full h-11 px-3.5 border border-borderCol rounded-input text-ink font-medium text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                      />
                    </div>

                    {/* Nomor KTP */}
                    <div>
                      <label className="block text-xs font-bold text-ink mb-1.5">
                        Nomor KTP
                      </label>
                      <input
                        type="text"
                        value={passenger.ktp}
                        onChange={e => updatePassenger(index, 'ktp', e.target.value)}
                        placeholder="16 digit nomor NIK/KTP"
                        className={`w-full h-11 px-3.5 border rounded-input text-ink font-mono text-sm outline-none transition-colors ${
                          hasKtpError
                            ? 'border-error focus:ring-1 focus:ring-error'
                            : isKtpValid
                            ? 'border-borderCol focus:border-primary'
                            : 'border-borderCol focus:border-primary'
                        }`}
                      />

                      {/* KTP Validation Message */}
                      <div className="mt-1.5 min-h-[20px]">
                        {isKtpValid ? (
                          <div className="flex items-center gap-1.5 text-xs text-success font-medium">
                            <Check size={13} className="stroke-[2.5]" />
                            <span>16 digit, format benar</span>
                          </div>
                        ) : hasKtpError ? (
                          <div className="flex items-start gap-1.5 text-xs text-error font-medium leading-tight">
                            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                            <span>
                              Nomor KTP harus 16 digit, baru terisi {digitsCount}. Lengkapi angkanya.
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Kontak Pemesan Card */}
            <div className="bg-white border border-borderCol rounded-card p-5 sm:p-6 shadow-2xs">
              <h2 className="text-base font-bold text-ink">Kontak pemesan</h2>
              <p className="text-xs text-muted mt-0.5 mb-5">
                E-tiket dan kabar perubahan jadwal dikirim ke sini.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full h-11 px-3.5 border border-borderCol rounded-input text-ink font-medium text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5">
                    Nomor HP (WhatsApp)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full h-11 px-3.5 border border-borderCol rounded-input text-ink font-medium text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              {/* Checkbox Simpan Data */}
              <label className="flex items-center gap-2.5 mt-5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={savePassenger}
                  onChange={e => setSavePassenger(e.target.checked)}
                  className="w-4 h-4 rounded border-borderCol text-primary accent-primary cursor-pointer"
                />
                <span className="text-xs sm:text-sm text-ink font-medium">
                  Simpan data penumpang untuk pemesanan berikutnya
                </span>
              </label>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-5 py-2.5 border border-primary text-primary hover:bg-primary-tint/30 text-sm font-bold rounded-input flex items-center gap-2 transition-all"
              >
                <ArrowLeft size={16} />
                <span>Kembali ke pilih kursi</span>
              </button>

              <button
                type="button"
                onClick={handleProceed}
                className="px-7 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-bold rounded-input transition-colors shadow-sm"
              >
                Lanjut ke review
              </button>
            </div>
          </div>

          {/* Right Column: Timer & Trip Summary */}
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
                <p className="text-xs text-muted">Nusa Trans · Executive 2–2</p>
              </div>

              <div className="pt-3 border-t border-borderCol flex items-center justify-between">
                <div className="text-xs text-muted">
                  Kursi <span className="font-bold text-ink">{seatsList.join(', ')}</span>
                </div>
                <Link
                  href={`/booking/${scheduleId}/seat?from=${from}&to=${to}&passengers=${seatsList.length}`}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Ubah kursi
                </Link>
              </div>

              <div className="pt-3 border-t border-borderCol space-y-2">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>{seatsList.length} kursi × Rp {pricePerSeat.toLocaleString('id-ID')}</span>
                  <span className="font-semibold text-ink">Rp {totalPrice.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex items-center justify-between text-base font-extrabold text-ink pt-1">
                  <span>Total</span>
                  <span className="text-xl">Rp {totalPrice.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function PassengerPage(props: {
  params: Promise<{ scheduleId: string }>
  searchParams: Promise<{
    seats?: string
    from?: string
    to?: string
    passengers?: string
    date?: string
  }>
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface p-8 text-center text-muted">Memuat data penumpang...</div>}>
      <PassengerContent {...props} />
    </Suspense>
  )
}
