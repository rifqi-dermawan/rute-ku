'use client'

import { use, useState, useEffect, useMemo, useRef, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Stepper from '@/components/Stepper'
import { Check, AlertCircle, ArrowLeft } from 'lucide-react'

export type PassengerType = 'dewasa' | 'anak'

interface Passenger {
  seat: string
  name: string
  type: PassengerType
  ktp: string
}

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
    passengersData?: string
    email?: string
    phone?: string
    dep?: string
    arr?: string
    dur?: string
    bus?: string
    cls?: string
    price?: string
  }>
}) {
  const { scheduleId } = use(params)
  const sp = use(searchParams)

  const from = sp.from ?? 'Jakarta'
  const to = sp.to ?? 'Bandung'
  const dateStr = sp.date ?? 'Sab, 10 Okt 2026'
  const seatsParam = sp.seats ?? '5A,5B'
  const seatsList = useMemo(() => seatsParam.split(',').filter(Boolean), [seatsParam])

  const dep = sp.dep ?? '08:00'
  const arr = sp.arr ?? '11:30'
  const bus = sp.bus ? decodeURIComponent(sp.bus) : 'Nusa Trans'
  const cls = sp.cls ? decodeURIComponent(sp.cls) : 'Executive 2–2'
  const pricePerSeat = sp.price ? parseInt(sp.price) : 125000

  const router = useRouter()

  // Passenger state: start completely blank per seat with default type
  const [passengers, setPassengers] = useState<Passenger[]>(() => {
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
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((p, idx) => ({
            seat: p.seat,
            name: p.name || '',
            type: (p.type === 'anak' ? 'anak' : 'dewasa') as PassengerType,
            ktp: p.ktp || '',
          }))
        }
      } catch {}
    }
    return seatsList.map((seat, idx) => ({
      seat,
      name: '',
      type: 'dewasa' as PassengerType,
      ktp: '',
    }))
  })

  // Contact person state: start blank unless passed in URL / session
  const [email, setEmail] = useState(() => sp.email ?? '')
  const [phone, setPhone] = useState(() => sp.phone ?? '')

  // Validation state
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Guard to ensure session hydration only executes once on initial mount
  const hasHydratedSessionRef = useRef(false)

  // Load sessionStorage on mount (only for current valid booking session)
  useEffect(() => {
    if (hasHydratedSessionRef.current) return
    hasHydratedSessionRef.current = true

    if (typeof window !== 'undefined' && !sp.passengersData) {
      try {
        const stored = sessionStorage.getItem('ruteku_passengers')
        if (stored) {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Sanitize legacy dummy names so they never reappear
            const sanitized = parsed.map((p: any) => {
              const isLegacyDummy =
                p.name === 'Dini Sartika' ||
                p.name === 'Rina Putri' ||
                p.ktp === '3171024589230001' ||
                p.ktp === '3171024589230002'
              return {
                seat: p.seat,
                name: isLegacyDummy ? '' : p.name,
                type: (p.type === 'anak' ? 'anak' : 'dewasa') as PassengerType,
                ktp: isLegacyDummy ? '' : (p.ktp || ''),
              }
            })
            // Only apply if seats match the current selection
            const storedSeats = sanitized.map(p => p.seat).sort().join(',')
            const currentSeats = seatsParam.split(',').filter(Boolean).sort().join(',')
            if (storedSeats === currentSeats) {
              setPassengers(sanitized)
            }
          }
        }
        const storedEmail = sessionStorage.getItem('ruteku_email')
        if (storedEmail && !storedEmail.includes('dini@') && !storedEmail.includes('contoh.id')) {
          setEmail(storedEmail)
        }
        const storedPhone = sessionStorage.getItem('ruteku_phone')
        if (storedPhone && !storedPhone.includes('0812-3456-7890')) {
          setPhone(storedPhone)
        }
      } catch {}
    }
  }, [sp.passengersData, seatsParam])

  // Auto-save timestamp state
  const [savedTime, setSavedTime] = useState('')

  useEffect(() => {
    const now = new Date()
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    setSavedTime(`${hh}:${mm}`)
  }, [passengers, email, phone])

  // Timer countdown
  const [timeLeft, setTimeLeft] = useState(494) // 08:14

  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(t)
  }, [])

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  // Validation logic with conditional validation based on passenger type
  const runValidation = (
    currentPassengers = passengers,
    currentEmail = email,
    currentPhone = phone
  ): Record<string, string> => {
    const errs: Record<string, string> = {}

    currentPassengers.forEach((p, idx) => {
      const trimmedName = p.name.trim()
      const isAdult = p.type !== 'anak'

      if (!trimmedName) {
        errs[`name_${idx}`] = `Nama Penumpang ${idx + 1} (Kursi ${p.seat}) wajib diisi.`
      } else if (trimmedName.length < 2) {
        errs[`name_${idx}`] = `Nama Penumpang ${idx + 1} minimal 2 karakter.`
      }

      const digits = (p.ktp || '').replace(/\D/g, '')

      if (isAdult) {
        // Dewasa: Wajib 16 digit KTP / NIK
        if (!p.ktp || !p.ktp.trim()) {
          errs[`ktp_${idx}`] = `Nomor Identitas Penumpang ${idx + 1} (Kursi ${p.seat}) wajib diisi 16 digit (KTP/NIK).`
        } else if (digits.length !== 16) {
          errs[`ktp_${idx}`] = `Nomor Identitas Dewasa harus tepat 16 digit angka (saat ini ${digits.length} digit).`
        }
      } else {
        // Anak / Bayi: Opsional (boleh kosong). Jika diisi sebagian, beri tahu format 16 digit
        if (p.ktp && p.ktp.trim() && digits.length > 0 && digits.length !== 16) {
          errs[`ktp_${idx}`] = `Jika diisi, nomor identitas anak/pendamping harus 16 digit (saat ini ${digits.length} digit).`
        }
      }
    })

    const trimmedEmail = currentEmail.trim()
    if (!trimmedEmail) {
      errs['email'] = 'Email pemesan wajib diisi untuk penerimaan e-tiket.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errs['email'] = 'Format email tidak valid (contoh: pemesan@email.com).'
    }

    const phoneDigits = currentPhone.replace(/\D/g, '')
    if (!currentPhone.trim()) {
      errs['phone'] = 'Nomor HP (WhatsApp) pemesan wajib diisi.'
    } else if (phoneDigits.length < 10) {
      errs['phone'] = `Nomor HP minimal 10 digit (saat ini ${phoneDigits.length} digit).`
    }

    return errs
  }

  const updatePassenger = (
    index: number,
    field: 'name' | 'ktp' | 'type',
    value: string
  ) => {
    setPassengers(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      if (hasAttemptedSubmit) {
        setErrors(runValidation(next, email, phone))
      }
      return next
    })
  }

  const handleEmailChange = (val: string) => {
    setEmail(val)
    if (hasAttemptedSubmit) {
      setErrors(runValidation(passengers, val, phone))
    }
  }

  const handlePhoneChange = (val: string) => {
    setPhone(val)
    if (hasAttemptedSubmit) {
      setErrors(runValidation(passengers, email, val))
    }
  }

  const handleProceed = () => {
    setHasAttemptedSubmit(true)
    const errs = runValidation(passengers, email, phone)
    setErrors(errs)

    const errorKeys = Object.keys(errs)
    if (errorKeys.length > 0) {
      // Scroll to error banner smoothly
      if (typeof window !== 'undefined') {
        const banner = document.getElementById('passenger-validation-banner')
        if (banner) {
          banner.scrollIntoView({ behavior: 'smooth', block: 'center' })
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
      }
      return // BLOCKS NAVIGATION
    }

    // Success: prepare clean data and proceed
    const cleanPassengers = passengers.map(p => ({
      seat: p.seat,
      name: p.name.trim(),
      type: p.type || 'dewasa',
      ktp: (p.ktp || '').replace(/\D/g, ''),
    }))

    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('ruteku_passengers', JSON.stringify(cleanPassengers))
        sessionStorage.setItem('ruteku_email', email.trim())
        sessionStorage.setItem('ruteku_phone', phone.trim())
      } catch {}
    }

    const encodedPassengers = encodeURIComponent(JSON.stringify(cleanPassengers))
    router.push(
      `/booking/${scheduleId}/review?seats=${seatsParam}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${encodeURIComponent(
        dateStr
      )}&passengersData=${encodedPassengers}&email=${encodeURIComponent(email.trim())}&phone=${encodeURIComponent(phone.trim())}&dep=${encodeURIComponent(dep)}&arr=${encodeURIComponent(arr)}&bus=${encodeURIComponent(bus)}&cls=${encodeURIComponent(cls)}&price=${pricePerSeat}`
    )
  }

  return (
    <div className="min-h-screen bg-surface pb-20">
      <Stepper currentStep={3} />

      <main className="max-w-6xl mx-auto px-3.5 sm:px-8 py-5 sm:py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h1 className="text-xl sm:text-3xl font-extrabold text-ink tracking-tight">
              Data penumpang
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-0.5">
              Satu formulir untuk tiap kursi. Isi sesuai identitas resmi agar boarding lancar.
            </p>
          </div>

          {savedTime && (
            <div className="flex items-center gap-1.5 text-xs text-muted font-medium self-start sm:self-auto">
              <Check size={14} className="text-success stroke-[2.5]" />
              <span>Draf tersimpan otomatis {savedTime}</span>
            </div>
          )}
        </div>

        {/* Validation Error Banner (Shows when submit was blocked) */}
        {hasAttemptedSubmit && Object.keys(errors).length > 0 && (
          <div
            id="passenger-validation-banner"
            className="mb-6 p-4 rounded-2xl bg-red-50 border-2 border-red-300 text-red-900 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1.5 flex-1">
                <h4 className="font-bold text-sm text-red-950">
                  Formulir Belum Lengkap ({Object.keys(errors).length} data wajib diisi)
                </h4>
                <p className="text-xs text-red-800 leading-relaxed">
                  Anda belum dapat melanjutkan ke tahap review. Mohon lengkapi seluruh data nama penumpang, nomor identitas penumpang dewasa (16 digit), serta kontak pemesan:
                </p>
                <ul className="list-disc pl-4 text-xs text-red-900 space-y-1 pt-0.5">
                  {Object.values(errors).map((msg, i) => (
                    <li key={i} className="font-medium">
                      {msg}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Content Layout */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Left Column: Passenger Cards & Contacts */}
          <div className="flex-1 w-full space-y-5 sm:space-y-6">
            {passengers.map((passenger, index) => {
              const isAdult = passenger.type !== 'anak'
              const rawKtp = (passenger.ktp || '').replace(/\s+/g, '')
              const digitsCount = rawKtp.replace(/\D/g, '').length
              const isKtpValid = /^\d{16}$/.test(rawKtp)
              const nameError = errors[`name_${index}`]
              const ktpError = errors[`ktp_${index}`]

              return (
                <div
                  key={passenger.seat}
                  className={`bg-white border rounded-card p-4 sm:p-6 shadow-2xs transition-all ${
                    nameError || ktpError ? 'border-red-300 ring-1 ring-red-200' : 'border-borderCol'
                  }`}
                >
                  {/* Card Header: Seat & Tipe Penumpang Selector */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-borderCol/50">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-ink text-base">
                        Penumpang {index + 1} · Kursi
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md bg-primary-tint text-primary border border-primary/30 text-xs font-bold font-mono">
                        {passenger.seat}
                      </span>
                    </div>

                    {/* Tipe Penumpang: Dewasa atau Anak / Bayi */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-muted mr-1 hidden sm:inline">
                        Tipe:
                      </span>
                      <div className="inline-flex items-center p-1 bg-surface border border-borderCol rounded-xl">
                        <button
                          type="button"
                          onClick={() => updatePassenger(index, 'type', 'dewasa')}
                          className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            isAdult
                              ? 'bg-primary text-white shadow-2xs'
                              : 'text-muted hover:text-ink'
                          }`}
                        >
                          Dewasa
                        </button>
                        <button
                          type="button"
                          onClick={() => updatePassenger(index, 'type', 'anak')}
                          className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            !isAdult
                              ? 'bg-amber-600 text-white shadow-2xs'
                              : 'text-muted hover:text-ink'
                          }`}
                        >
                          Anak / Bayi
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Nama Lengkap */}
                    <div>
                      <label className="block text-xs font-bold text-ink mb-1.5">
                        Nama lengkap (sesuai identitas) <span className="text-error">*</span>
                      </label>
                      <input
                        type="text"
                        value={passenger.name}
                        onChange={e => updatePassenger(index, 'name', e.target.value)}
                        placeholder={isAdult ? 'Masukkan nama lengkap penumpang' : 'Nama lengkap anak / bayi'}
                        className={`w-full h-11 px-3.5 border rounded-input text-ink font-medium text-sm outline-none transition-all ${
                          nameError
                            ? 'border-error bg-red-50/20 ring-1 ring-error focus:ring-error'
                            : 'border-borderCol focus:border-primary focus:ring-1 focus:ring-primary'
                        }`}
                      />
                      {nameError && (
                        <p className="mt-1 text-xs text-error font-medium flex items-center gap-1">
                          <AlertCircle size={13} className="flex-shrink-0" />
                          <span>{nameError}</span>
                        </p>
                      )}
                    </div>

                    {/* Nomor Identitas (KTP/NIK KK/KIA) */}
                    <div>
                      <label className="block text-xs font-bold text-ink mb-1.5">
                        Nomor Identitas (KTP/NIK KK/KIA){' '}
                        {isAdult ? (
                          <span className="text-error">*</span>
                        ) : (
                          <span className="text-muted font-normal text-[11px]">(Opsional)</span>
                        )}
                      </label>
                      <input
                        type="text"
                        maxLength={16}
                        value={passenger.ktp}
                        onChange={e => updatePassenger(index, 'ktp', e.target.value)}
                        placeholder={
                          isAdult
                            ? '16 digit nomor NIK/KTP'
                            : '16 digit NIK KK / KIA (opsional)'
                        }
                        className={`w-full h-11 px-3.5 border rounded-input text-ink font-mono text-sm outline-none transition-all ${
                          ktpError
                            ? 'border-error bg-red-50/20 ring-1 ring-error focus:ring-error'
                            : isKtpValid
                            ? 'border-success/60 focus:border-success focus:ring-1 focus:ring-success'
                            : 'border-borderCol focus:border-primary focus:ring-1 focus:ring-primary'
                        }`}
                      />

                      {/* Helper text for Child / Optional */}
                      {!isAdult && (
                        <p className="mt-1.5 text-[11px] text-muted leading-tight">
                          Dapat dikosongkan atau diisi dengan KTP orang tua pendamping
                        </p>
                      )}

                      {/* KTP Validation Message */}
                      <div className="mt-1 min-h-[18px]">
                        {ktpError ? (
                          <div className="flex items-start gap-1 text-xs text-error font-medium leading-tight">
                            <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                            <span>{ktpError}</span>
                          </div>
                        ) : isKtpValid ? (
                          <div className="flex items-center gap-1.5 text-xs text-success font-medium">
                            <Check size={13} className="stroke-[2.5]" />
                            <span>16 digit, format benar</span>
                          </div>
                        ) : isAdult && digitsCount > 0 ? (
                          <span className="text-[11px] text-muted">
                            {digitsCount}/16 digit terisi
                          </span>
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
                E-tiket dan kabar perubahan jadwal akan dikirim ke kontak ini.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5">
                    Email Pemesan <span className="text-error">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => handleEmailChange(e.target.value)}
                    placeholder="nama@email.com"
                    className={`w-full h-11 px-3.5 border rounded-input text-ink font-medium text-sm outline-none transition-all ${
                      errors['email']
                        ? 'border-error bg-red-50/20 ring-1 ring-error focus:ring-error'
                        : 'border-borderCol focus:border-primary focus:ring-1 focus:ring-primary'
                    }`}
                  />
                  {errors['email'] ? (
                    <p className="mt-1 text-xs text-error font-medium flex items-center gap-1">
                      <AlertCircle size={13} className="flex-shrink-0" />
                      <span>{errors['email']}</span>
                    </p>
                  ) : (
                    <p className="mt-1 text-[11px] text-muted">Bukti e-tiket dikirim ke email ini</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5">
                    Nomor HP (WhatsApp) <span className="text-error">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => handlePhoneChange(e.target.value)}
                    placeholder="081234567890"
                    className={`w-full h-11 px-3.5 border rounded-input text-ink font-medium text-sm outline-none transition-all ${
                      errors['phone']
                        ? 'border-error bg-red-50/20 ring-1 ring-error focus:ring-error'
                        : 'border-borderCol focus:border-primary focus:ring-1 focus:ring-primary'
                    }`}
                  />
                  {errors['phone'] ? (
                    <p className="mt-1 text-xs text-error font-medium flex items-center gap-1">
                      <AlertCircle size={13} className="flex-shrink-0" />
                      <span>{errors['phone']}</span>
                    </p>
                  ) : (
                    <p className="mt-1 text-[11px] text-muted">Untuk notifikasi WhatsApp &amp; konfirmasi</p>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="w-full sm:w-auto px-5 py-2.5 border border-primary text-primary hover:bg-primary-tint/30 text-sm font-bold rounded-input flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <ArrowLeft size={16} />
                <span>Kembali ke pilih kursi</span>
              </button>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                {hasAttemptedSubmit && Object.keys(errors).length > 0 && (
                  <span className="text-xs font-semibold text-error flex items-center gap-1.5 animate-pulse">
                    <AlertCircle size={14} className="flex-shrink-0" />
                    <span>Lengkapi {Object.keys(errors).length} data di atas</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleProceed}
                  className="w-full sm:w-auto px-7 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-bold rounded-input transition-colors shadow-sm cursor-pointer"
                >
                  Lanjut ke review
                </button>
              </div>
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
                  {dateStr} · {dep} – {arr}
                </p>
                <p className="text-xs text-muted">{bus} ({cls})</p>
              </div>

              <div className="pt-3 border-t border-borderCol space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-muted">
                  <span>Kursi</span>
                  <span className="font-bold text-ink font-mono">{seatsParam}</span>
                </div>
                <div className="flex items-center justify-between text-muted">
                  <span>Jumlah</span>
                  <span className="font-bold text-ink">{seatsList.length} penumpang</span>
                </div>
              </div>

              <div className="pt-3 border-t border-borderCol flex items-center justify-between">
                <span className="text-sm font-bold text-ink">Total</span>
                <span className="text-xl font-black text-ink">
                  Rp {(seatsList.length * pricePerSeat).toLocaleString('id-ID')}
                </span>
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
    passengersData?: string
    email?: string
    phone?: string
    dep?: string
    arr?: string
    dur?: string
    bus?: string
    cls?: string
    price?: string
  }>
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface p-8 text-center text-muted">Memuat data penumpang...</div>}>
      <PassengerContent {...props} />
    </Suspense>
  )
}
