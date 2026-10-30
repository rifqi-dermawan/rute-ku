'use client'

import { use, useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Stepper from '@/components/Stepper'
import { useAuth } from '@/lib/auth-context'
import {
  ArrowLeft,
  Clock,
  Copy,
  Check,
  Info,
  QrCode,
  Smartphone,
  CreditCard,
  Building2,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  User as UserIcon,
  LogIn,
} from 'lucide-react'

declare global {
  interface Window {
    snap?: any
  }
}

const PAYMENT_METHODS = [
  { id: 'qris', label: 'QRIS Sandbox', sub: 'Scan QRIS atau Simulasi Instan' },
  { id: 'va', label: 'Virtual Account', sub: 'BCA, Mandiri, BNI, BRI (Midtrans Snap)' },
  { id: 'ewallet', label: 'E-Wallet', sub: 'GoPay, ShopeePay, OVO, Dana' },
  { id: 'card', label: 'Kartu Kredit / Debit', sub: 'Visa, Mastercard, JCB' },
]

const VA_BANKS = [
  { id: 'bca', name: 'BCA Virtual Account', prefix: '8277', example: '8277 0812 3456 7890' },
  { id: 'mandiri', name: 'Mandiri Bill Payment', prefix: '8870', example: '8870 8123 4567 8901' },
  { id: 'bni', name: 'BNI Virtual Account', prefix: '8241', example: '8241 0812 3456 7890' },
  { id: 'bri', name: 'BRIVA (BRI)', prefix: '8021', example: '8021 0812 3456 7890' },
]

const EWALLET_LIST = [
  { id: 'gopay', name: 'GoPay', color: 'bg-[#00AED6]' },
  { id: 'ovo', name: 'OVO', color: 'bg-[#4C3494]' },
  { id: 'dana', name: 'DANA', color: 'bg-[#118EEA]' },
  { id: 'shopeepay', name: 'ShopeePay', color: 'bg-[#EE4D2D]' },
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
  const { user, openAuthModal } = useAuth()
  const router = useRouter()

  const from = sp.from ?? 'Jakarta'
  const to = sp.to ?? 'Bandung'
  const dateStr = sp.date ?? 'Sabtu, 10 Okt 2026'
  const seatsParam = sp.seats ?? '5A, 5B'
  const total = sp.total ?? '250000'
  const dep = sp.dep ?? '08:00'
  const arr = sp.arr ?? '11:30'
  const bus = sp.bus ?? 'Nusa Trans'
  const cls = sp.cls ?? 'Executive 2–2'

  let passengerNames = 'Penumpang 1, Penumpang 2'
  try {
    let raw = sp.passengersData ?? ''
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('ruteku_passengers')
      if (stored) raw = stored
    }
    if (raw) {
      if (raw.includes('%')) {
        try { raw = decodeURIComponent(raw) } catch {}
      }
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        passengerNames = parsed.map((p: any) => p.name).filter(Boolean).join(', ')
      }
    }
  } catch {}

  const [selectedMethod, setSelectedMethod] = useState('qris')
  const [selectedBank, setSelectedBank] = useState('bca')
  const [selectedEwallet, setSelectedEwallet] = useState('gopay')
  const [ewalletPhone, setEwalletPhone] = useState('')
  const [generatedVa, setGeneratedVa] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState(false)
  const [midtransError, setMidtransError] = useState('')
  const [midtransLoading, setMidtransLoading] = useState(false)

  // Card state
  const [cardNumber, setCardNumber] = useState('')
  const [cardExp, setCardExp] = useState('')
  const [cardCvv, setCardCvv] = useState('')

  // QRIS sandbox state
  const [qrisData, setQrisData] = useState<{
    orderId: string
    qrUrl: string
    amount: number
    expiryTime: string | null
  } | null>(null)
  const [qrisLoading, setQrisLoading] = useState(false)
  const [qrisError, setQrisError] = useState('')
  const [qrisCopied, setQrisCopied] = useState(false)
  const [qrisStatus, setQrisStatus] = useState<'pending' | 'paid' | 'expired' | 'failed'>('pending')
  const [simulating, setSimulating] = useState(false)

  // Countdown timer: 15 menit (900 detik)
  const [secondsLeft, setSecondsLeft] = useState(900)

  useEffect(() => {
    const t = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(t)
  }, [])

  // Load Midtrans Snap Script for VA, E-Wallet, Card
  useEffect(() => {
    const snapScriptUrl = 'https://app.sandbox.midtrans.com/snap/snap.js'
    const clientKey =
      process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ||
      process.env.MIDTRANS_CLIENT_KEY ||
      'SB-Mid-client-YZutZLVqxHIk3.DYt.cHUzBt'

    if (!document.querySelector(`script[src="${snapScriptUrl}"]`)) {
      const script = document.createElement('script')
      script.src = snapScriptUrl
      script.setAttribute('data-client-key', clientKey)
      script.async = true
      document.body.appendChild(script)
    }
  }, [])

  // Polling status QRIS setiap 3 detik setelah QR berhasil dibuat
  useEffect(() => {
    if (!qrisData || qrisStatus !== 'pending') return

    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/qris/status/${encodeURIComponent(qrisData.orderId)}`)
        const json = await res.json()
        const rawStatus = (json.status || '').toUpperCase()

        if (rawStatus === 'SUCCESS' || rawStatus === 'PAID') {
          setQrisStatus('paid')
          clearInterval(poll)
          navigateToEticket()
        } else if (rawStatus === 'EXPIRED') {
          setQrisStatus('expired')
          clearInterval(poll)
          setQrisError('QR Code telah kedaluwarsa. Silakan buat QR baru.')
          setQrisData(null)
        } else if (rawStatus === 'FAILED' || rawStatus === 'CANCEL' || rawStatus === 'DENY') {
          setQrisStatus('failed')
          clearInterval(poll)
          setQrisError('Pembayaran gagal atau dibatalkan.')
          setQrisData(null)
        }
      } catch {
        // polling error - abaikan
      }
    }, 3000)

    return () => clearInterval(poll)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrisData, qrisStatus])

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const currentVaBank = VA_BANKS.find((b) => b.id === selectedBank) ?? VA_BANKS[0]
  const activeVaNumber = generatedVa[selectedBank]

  const handleGenerateVa = (bankId: string) => {
    const bank = VA_BANKS.find((b) => b.id === bankId) ?? VA_BANKS[0]
    const p1 = Math.floor(1000 + Math.random() * 9000)
    const p2 = Math.floor(1000 + Math.random() * 9000)
    const p3 = Math.floor(1000 + Math.random() * 9000)
    const code = `${bank.prefix} ${p1} ${p2} ${p3}`
    setGeneratedVa((prev) => ({ ...prev, [bankId]: code }))
    return code
  }

  const copyVA = (codeToCopy?: string) => {
    let val = codeToCopy || activeVaNumber
    if (!val) {
      val = handleGenerateVa(selectedBank)
    }
    navigator.clipboard.writeText(val.replace(/\s+/g, ''))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const [currentBooking, setCurrentBooking] = useState<{
    id: string
    code: string
    publicToken: string
    grandTotal: number
  } | null>(null)

  // Pastikan booking sudah tersimpan di database sebelum meminta pembayaran
  const ensureBookingInDatabase = async () => {
    if (currentBooking) return currentBooking

    let raw = sp.passengersData ?? ''
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('ruteku_passengers')
      if (stored) raw = stored
    }
    let parsedPassengersList: any[] = []
    try {
      if (raw.includes('%')) raw = decodeURIComponent(raw)
      parsedPassengersList = JSON.parse(raw)
    } catch {}

    const seatList = seatsParam.split(',').map((s) => s.trim()).filter(Boolean)
    const passengersPayload =
      Array.isArray(parsedPassengersList) && parsedPassengersList.length > 0
        ? parsedPassengersList.map((p, idx) => ({
            seatNumber: p.seat || seatList[idx] || seatList[0],
            fullName: p.name || `Penumpang ${idx + 1}`,
            passengerType: p.type || 'adult',
          }))
        : seatList.map((seatNumber) => ({
            seatNumber,
            fullName: user?.name || passengerNames?.split(',')[0]?.trim() || 'Penumpang RuteKu',
            passengerType: 'adult',
          }))

    const contactName = (user?.name || passengerNames?.split(',')[0] || 'Penumpang RuteKu').trim()
    const contactEmail = (user?.email || sp.email || 'customer@ruteku.id').trim()
    const contactPhone = (user?.phone || sp.phone || '081234567890').trim()

    const createBookingRes = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scheduleId,
        seats: seatList,
        passengers: passengersPayload,
        contactName,
        contactEmail,
        contactPhone,
      }),
    })

    const bookingData = await createBookingRes.json()
    if (!createBookingRes.ok || !bookingData.booking) {
      throw new Error(bookingData.error || 'Gagal menyimpan data pesanan.')
    }

    setCurrentBooking(bookingData.booking)
    return bookingData.booking
  }

  // Generate QRIS via Midtrans Core API
  const handleGenerateQris = async () => {
    setQrisLoading(true)
    setQrisError('')
    setQrisData(null)
    setQrisStatus('pending')

    try {
      const activeBooking = await ensureBookingInDatabase()

      const res = await fetch('/api/payment/qris', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: activeBooking?.id,
          publicToken: activeBooking?.publicToken,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.qrUrl) {
        setQrisError(data.error || 'Gagal membuat QR Code. Silakan coba lagi.')
        setQrisLoading(false)
        return
      }

      setQrisData(data)
    } catch (err: any) {
      setQrisError(err?.message || 'Terjadi kendala koneksi saat membuat QR Code.')
    } finally {
      setQrisLoading(false)
    }
  }

  const handleSimulatePayment = async () => {
    if (!qrisData) return
    setSimulating(true)
    setQrisError('')
    try {
      const res = await fetch('/api/payment/qris/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: qrisData.orderId }),
      })
      const json = await res.json()
      if (json.success) {
        setQrisStatus('paid')
        navigateToEticket()
      } else {
        setQrisError(json.error || 'Gagal memproses simulasi pembayaran.')
      }
    } catch {
      setQrisError('Kendala koneksi saat menghubungi simulator pembayaran.')
    } finally {
      setSimulating(false)
    }
  }

  const handlePayWithMidtrans = async () => {
    setMidtransLoading(true)
    setMidtransError('')

    try {
      const activeBooking = await ensureBookingInDatabase()

      const res = await fetch('/api/payment/midtrans/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: `RUTEKU-${activeBooking.code}-${Date.now().toString().slice(-6)}`,
          grossAmount: activeBooking.grandTotal || parseInt(total) || 100000,
          customerDetails: {
            first_name: user?.name || passengerNames?.split(',')[0]?.trim() || 'Penumpang RuteKu',
            email: user?.email || sp.email || 'customer@ruteku.id',
            phone: ewalletPhone || user?.phone || sp.phone || '081234567890',
          },
          itemDetails: [
            {
              id: scheduleId,
              price: activeBooking.grandTotal || parseInt(total) || 100000,
              quantity: 1,
              name: `Tiket Bus ${bus} (${cls}) ${from} - ${to}`.slice(0, 50),
            },
          ],
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.token) {
        setMidtransLoading(false)
        setMidtransError(data.error || 'Gagal memuat gateway pembayaran Midtrans.')
        return
      }

      if (data.token) {
        if (typeof window !== 'undefined' && window.snap) {
          window.snap.pay(data.token, {
            onSuccess: function () {
              setMidtransLoading(false)
              navigateToEticket()
            },
            onPending: function () {
              setMidtransLoading(false)
              navigateToEticket()
            },
            onError: function () {
              setMidtransLoading(false)
              setMidtransError('Pembayaran dibatalkan atau tidak berhasil diproses.')
            },
            onClose: function () {
              setMidtransLoading(false)
            },
          })
        } else if (data.redirect_url) {
          window.location.href = data.redirect_url
        } else {
          setMidtransLoading(false)
          setMidtransError('Gateway pembayaran Midtrans Snap tidak dapat dibuka. Silakan gunakan metode QRIS.')
        }
      }
    } catch (err: any) {
      setMidtransLoading(false)
      setMidtransError(err?.message || 'Terjadi kendala saat menghubungkan ke gateway pembayaran.')
    }
  }

  const navigateToEticket = async () => {
    let rawPassengers = sp.passengersData ?? ''
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('ruteku_passengers')
      if (stored) rawPassengers = stored
    }
    try {
      if (rawPassengers.includes('%')) {
        rawPassengers = decodeURIComponent(rawPassengers)
      }
    } catch {}

    const dynamicCode = currentBooking?.code || `RK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    const publicToken = currentBooking?.publicToken || ''

    if (typeof window !== 'undefined') {
      try {
        const rawList = localStorage.getItem('ruteku_recent_bookings')
        const list = rawList ? JSON.parse(rawList) : []
        if (!list.includes(dynamicCode)) {
          list.unshift(dynamicCode)
          localStorage.setItem('ruteku_recent_bookings', JSON.stringify(list.slice(0, 10)))
        }
      } catch {}
    }

    // Trigger asynchronous official E-Ticket Email dispatch
    const targetEmail = user?.email || sp.email
    if (targetEmail) {
      try {
        fetch('/api/email/eticket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: targetEmail,
            bookingCode: dynamicCode,
            passengerNames: passengerNames || 'Penumpang RuteKu',
            seats: seatsParam,
            from,
            toCity: to,
            date: dateStr,
            dep,
            arr,
            bus,
            cls,
            totalAmount: parseInt(total) || 250000,
          }),
        }).catch(() => {})
      } catch (e) {}
    }

    router.push(
      `/booking/${scheduleId}/eticket?seats=${seatsParam}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${encodeURIComponent(
        dateStr
      )}&passengersData=${encodeURIComponent(rawPassengers)}&email=${encodeURIComponent(
        user?.email ?? sp.email ?? ''
      )}&phone=${encodeURIComponent(user?.phone ?? sp.phone ?? '')}&total=${total}&dep=${encodeURIComponent(dep)}&arr=${encodeURIComponent(arr)}&bus=${encodeURIComponent(bus)}&cls=${encodeURIComponent(cls)}&code=${dynamicCode}&publicToken=${publicToken}`
    )
  }

  return (
    <div className="min-h-screen bg-surface pb-20">
      <Stepper currentStep={5} />

      <main className="max-w-6xl mx-auto px-3.5 sm:px-8 py-3 sm:py-8">
        {/* Title */}
        <div className="mb-3 sm:mb-5">
          <h1 className="text-xl sm:text-3xl font-black text-ink tracking-tight">
            Pembayaran
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-0.5">
            Selesaikan sebelum timer habis agar kursi {seatsParam} tidak dilepas.
          </p>
        </div>

        {/* Info Banner Akun & Keamanan */}
        {user ? (
          <div className="mb-3.5 sm:mb-5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-600 flex-shrink-0" />
              <span>
                Akun Terhubung: <strong>{user.name}</strong> ({user.email}). Tiket otomatis masuk ke riwayat privat Anda.
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-200/50 text-emerald-800">
              Terverifikasi
            </span>
          </div>
        ) : (
          <div className="mb-3.5 sm:mb-5 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-xs flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <UserIcon size={16} className="text-blue-600 flex-shrink-0" />
              <span>
                Belum masuk akun? Masuk sekarang agar tiket otomatis tersimpan di riwayat akun privat Anda.
              </span>
            </div>
            <button
              type="button"
              onClick={() => openAuthModal({ mode: 'login' })}
              className="px-3 py-1 bg-primary text-white rounded-lg font-bold text-xs hover:bg-primary-dark transition cursor-pointer flex-shrink-0"
            >
              Masuk / Daftar
            </button>
          </div>
        )}

        {/* Error Banner jika terjadi kendala gateway */}
        {midtransError && (
          <div className="mb-3.5 sm:mb-6 p-3 sm:p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 text-xs sm:text-sm flex items-start gap-3 shadow-2xs">
            <AlertCircle size={18} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <strong className="font-bold text-red-950 dark:text-red-100">Kendala Pembayaran</strong>
              <p className="text-red-800 dark:text-red-300/90">{midtransError}</p>
            </div>
          </div>
        )}

        {/* Amber Alert Banner Countdown */}
        <div className="mb-3.5 sm:mb-6 p-3 sm:p-4 rounded-xl bg-[#FEF6EE] dark:bg-[#2A1805]/80 border border-[#F9DBAF] dark:border-[#7A3E08] text-[#93370D] dark:text-[#FDB022] flex items-start gap-3 shadow-2xs">
          <Clock size={18} className="text-[#93370D] dark:text-[#FDB022] flex-shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm leading-relaxed">
            <strong className="font-bold text-[#7A271A] dark:text-[#FEDF89]">
              Waktu pembayaran tersisa {fmtTime(secondsLeft)}
            </strong>
            <p className="text-[#93370D] dark:text-[#FDB022]/90 mt-0.5">
              Kursi {seatsParam} ditahan aman selama timer berjalan. Silakan selesaikan pembayaran.
            </p>
          </div>
        </div>

        {/* Content Layout */}
        <div className="flex flex-col lg:flex-row gap-3.5 sm:gap-6 items-start">
          {/* Left Column */}
          <div className="flex-1 w-full space-y-3.5 sm:space-y-6">
            {/* Card 1: Pilih Metode Pembayaran */}
            <div className="bg-white dark:bg-[#102434] border border-borderCol dark:border-white/10 rounded-card p-3.5 sm:p-6 shadow-2xs">
              <h2 className="text-base font-bold text-ink dark:text-white mb-2.5 sm:mb-4">
                Pilih metode pembayaran
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PAYMENT_METHODS.map((m) => {
                  const isSel = selectedMethod === m.id
                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMethod(m.id)}
                      className={`flex items-start justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSel
                          ? 'border-primary bg-primary-tint/40 dark:bg-primary/20 shadow-xs ring-1 ring-primary/30'
                          : 'border-borderCol dark:border-white/10 hover:border-primary/40 bg-white dark:bg-white/5'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-4 h-4 mt-0.5 rounded-full border flex items-center justify-center transition-colors flex-shrink-0 ${
                            isSel ? 'border-primary bg-primary' : 'border-borderCol bg-white'
                          }`}
                        >
                          {isSel && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div>
                          <span className="font-bold text-sm text-ink dark:text-white block leading-snug">
                            {m.label}
                          </span>
                          {m.sub && (
                            <span className="text-[11px] text-muted dark:text-gray-400 font-medium block mt-0.5">
                              {m.sub}
                            </span>
                          )}
                        </div>
                      </div>
                      {m.id === 'qris' && (
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded">
                          Instan
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Card 2: QRIS Tab */}
            {selectedMethod === 'qris' && (
              <div className="bg-white dark:bg-[#102434] border border-borderCol dark:border-white/10 rounded-card p-3.5 sm:p-6 shadow-2xs space-y-3.5 sm:space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h2 className="text-base font-bold text-ink dark:text-white flex items-center gap-2">
                      <QrCode size={18} className="text-primary" />
                      <span>Pembayaran QRIS Midtrans Sandbox</span>
                    </h2>
                    <p className="text-xs text-muted dark:text-gray-400 mt-0.5">
                      QR Code Sandbox Midtrans — dukung simulator instan atau manual
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                      qrisStatus === 'paid'
                        ? 'bg-success/10 text-success border-success/30'
                        : qrisStatus === 'expired' || qrisStatus === 'failed'
                        ? 'bg-red-50 text-red-600 border-red-200'
                        : qrisData
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-info/10 text-info border-info/30'
                    }`}
                  >
                    <Info size={13} />
                    <span>
                      {qrisStatus === 'paid'
                        ? 'Lunas!'
                        : qrisStatus === 'expired'
                        ? 'QR Kedaluwarsa'
                        : qrisStatus === 'failed'
                        ? 'Gagal'
                        : qrisData
                        ? 'Menunggu scan…'
                        : 'Belum dibuat'}
                    </span>
                  </span>
                </div>

                {/* QR Container */}
                <div className="p-5 bg-surface dark:bg-white/5 border border-borderCol dark:border-white/10 rounded-2xl text-center space-y-4">
                  {!qrisData && !qrisLoading && (
                    <div className="py-6 space-y-4">
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                        <QrCode size={32} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-ink dark:text-white">QR Code Belum Dibuat</p>
                        <p className="text-xs text-muted dark:text-gray-400 mt-1">
                          Klik tombol di bawah untuk membuat QRIS dari Midtrans Sandbox.
                        </p>
                      </div>
                    </div>
                  )}

                  {qrisLoading && (
                    <div className="py-8 flex flex-col items-center gap-3">
                      <RefreshCw size={28} className="animate-spin text-primary" />
                      <p className="text-sm text-muted">Membuat QR Code dari Midtrans...</p>
                    </div>
                  )}

                  {qrisError && !qrisLoading && (
                    <div className="py-2 flex items-start gap-2 text-xs text-red-700 bg-red-50 rounded-xl p-3">
                      <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                      <span>{qrisError}</span>
                    </div>
                  )}

                  {qrisData && !qrisLoading && (
                    <>
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-white dark:bg-black border border-borderCol dark:border-white/10 rounded-full text-xs font-bold text-ink dark:text-white shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                        <span>Order: {qrisData.orderId.slice(-12)}</span>
                      </div>

                      {/* QR Image dari Midtrans */}
                      <div className="relative w-56 h-56 mx-auto bg-white p-3 rounded-2xl border border-borderCol shadow-md flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={qrisData.qrUrl}
                          alt="QRIS Midtrans Sandbox"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      </div>

                      <div className="space-y-1">
                        <span className="text-xl sm:text-2xl font-black text-ink dark:text-white block">
                          Rp {qrisData.amount.toLocaleString('id-ID')}
                        </span>
                        <span className="text-xs text-muted block">Jumlah pas tanpa biaya admin</span>
                      </div>

                      {/* Tombol salin URL QR */}
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(qrisData.qrUrl)
                          setQrisCopied(true)
                          setTimeout(() => setQrisCopied(false), 2500)
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-borderCol dark:border-white/10 rounded-lg bg-white dark:bg-white/5 hover:border-primary hover:text-primary transition-all cursor-pointer"
                      >
                        {qrisCopied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                        <span>{qrisCopied ? 'URL Tersalin!' : 'Salin URL QR (untuk simulator)'}</span>
                      </button>

                      {/* Polling indicator */}
                      <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted">
                        <RefreshCw size={11} className="animate-spin" />
                        <span>Mengecek status pembayaran setiap 3 detik...</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Action Area */}
                <div className="pt-2 space-y-2">
                  {qrisData && qrisStatus === 'pending' && (
                    <button
                      type="button"
                      disabled={simulating}
                      onClick={handleSimulatePayment}
                      className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs sm:text-sm font-bold rounded-input flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {simulating ? (
                        <>
                          <RefreshCw size={15} className="animate-spin" />
                          <span>Menghubungi Simulator Midtrans...</span>
                        </>
                      ) : (
                        <>
                          <span>⚡ Simulasi Bayar Sukses (Uji Coba Sandbox)</span>
                        </>
                      )}
                    </button>
                  )}

                  {!qrisData || qrisStatus === 'expired' || qrisStatus === 'failed' ? (
                    <button
                      type="button"
                      disabled={qrisLoading}
                      onClick={handleGenerateQris}
                      className="w-full py-3.5 px-4 bg-primary hover:bg-primary-dark text-white text-sm font-bold rounded-input flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {qrisLoading ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          <span>Membuat QR Code...</span>
                        </>
                      ) : (
                        <>
                          <QrCode size={16} />
                          <span>{qrisData ? 'Buat QR Code Baru' : 'Buat QR Code QRIS'}</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="text-center text-xs text-muted py-1">
                      Atau salin URL QR dan buka{' '}
                      <a
                        href="https://simulator.sandbox.midtrans.com/v2/qris/index"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary font-semibold hover:underline"
                      >
                        QRIS Simulator Midtrans
                      </a>.
                    </div>
                  )}
                </div>

                {/* Instructions & Warning */}
                <div className="pt-2 border-t border-borderCol/60 dark:border-white/10 space-y-2.5">
                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] sm:text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                    <strong>⚠️ Perhatian Uji Coba:</strong> Ini adalah QRIS Sandbox Midtrans. <strong>JANGAN scan menggunakan aplikasi perbankan asli di ponsel</strong> (BCA, GoPay, Dana asli). Gunakan tombol hijau <strong>⚡ Simulasi Bayar Sukses</strong> untuk pengujian instan.
                  </div>
                </div>
              </div>
            )}

            {/* Card 3: Virtual Account Tab */}
            {selectedMethod === 'va' && (
              <div className="bg-white dark:bg-[#102434] border border-borderCol dark:border-white/10 rounded-card p-3.5 sm:p-6 shadow-2xs space-y-3.5 sm:space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-base font-bold text-ink dark:text-white flex items-center gap-2">
                    <Building2 size={18} className="text-primary" />
                    <span>Transfer ke Virtual Account</span>
                  </h2>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-info/10 text-info border border-info/30 text-xs font-semibold">
                    <Info size={13} />
                    <span>Dukungan Midtrans Snap</span>
                  </span>
                </div>

                {/* Bank Selector */}
                <div>
                  <label className="block text-xs font-bold text-ink dark:text-white mb-2">Pilih Bank</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {VA_BANKS.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelectedBank(b.id)}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                          selectedBank === b.id
                            ? 'border-primary bg-primary-tint/50 text-primary ring-1 ring-primary/40'
                            : 'border-borderCol dark:border-white/10 bg-white dark:bg-white/5 text-ink dark:text-white hover:border-primary/40'
                        }`}
                      >
                        {b.name.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Virtual Account Box */}
                <div className="p-4 bg-surface dark:bg-white/5 border border-borderCol dark:border-white/10 rounded-xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
                          {currentVaBank.name.toUpperCase()}
                        </span>
                        {activeVaNumber ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-bold">
                            <Check size={10} />
                            <span>Nomor Terbit</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                            Simulasi
                          </span>
                        )}
                      </div>

                      {activeVaNumber ? (
                        <span className="text-xl sm:text-2xl font-mono font-bold text-ink dark:text-white tracking-wider select-all">
                          {activeVaNumber}
                        </span>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="text-xl sm:text-2xl font-mono font-bold text-muted/60 tracking-wider">
                            {currentVaBank.prefix} •••• •••• ••••
                          </span>
                          <p className="text-[11px] text-muted">
                            Nomor rekening virtual otomatis ({currentVaBank.example})
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      {!activeVaNumber ? (
                        <button
                          type="button"
                          onClick={() => handleGenerateVa(selectedBank)}
                          className="px-3.5 py-2 bg-primary hover:bg-primary-dark text-white rounded-input text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                        >
                          <RefreshCw size={13} />
                          <span>Buat Nomor VA</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => copyVA(activeVaNumber)}
                            className="px-3.5 py-2 border border-borderCol dark:border-white/10 bg-white dark:bg-white/5 hover:border-primary hover:text-primary rounded-input text-xs font-bold text-ink dark:text-white flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
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
                          <button
                            type="button"
                            onClick={() => handleGenerateVa(selectedBank)}
                            title="Buat ulang nomor VA"
                            className="p-2 border border-borderCol dark:border-white/10 bg-white dark:bg-white/5 hover:border-primary hover:text-primary rounded-input text-muted transition-all cursor-pointer"
                          >
                            <RefreshCw size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Amount to pay */}
                <div className="flex items-center justify-between py-2 border-b border-borderCol/60 dark:border-white/10">
                  <span className="text-xs sm:text-sm text-muted">Jumlah yang harus dibayar (pas)</span>
                  <span className="text-xl sm:text-2xl font-extrabold text-ink dark:text-white">
                    Rp {parseInt(total).toLocaleString('id-ID')}
                  </span>
                </div>

                {/* Action Area */}
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={midtransLoading}
                    onClick={handlePayWithMidtrans}
                    className="w-full py-3.5 px-4 bg-primary hover:bg-primary-dark text-white text-sm font-bold rounded-input flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {midtransLoading ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Membuka Midtrans Snap...</span>
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        <span>Bayar via Midtrans Snap</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Card 4: E-Wallet Tab */}
            {selectedMethod === 'ewallet' && (
              <div className="bg-white dark:bg-[#102434] border border-borderCol dark:border-white/10 rounded-card p-3.5 sm:p-6 shadow-2xs space-y-3.5 sm:space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-base font-bold text-ink dark:text-white flex items-center gap-2">
                    <Smartphone size={18} className="text-primary" />
                    <span>Pembayaran E-Wallet</span>
                  </h2>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-info/10 text-info border border-info/30 text-xs font-semibold">
                    <Info size={13} />
                    <span>GoPay / OVO / Dana / ShopeePay</span>
                  </span>
                </div>

                {/* E-Wallet Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {EWALLET_LIST.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setSelectedEwallet(w.id)}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        selectedEwallet === w.id
                          ? 'border-primary bg-primary-tint/50 text-primary ring-1 ring-primary/40'
                          : 'border-borderCol dark:border-white/10 bg-white dark:bg-white/5 text-ink dark:text-white hover:border-primary/40'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full ${w.color}`} />
                      <span>{w.name}</span>
                    </button>
                  ))}
                </div>

                {/* Amount to pay */}
                <div className="flex items-center justify-between py-2 border-b border-borderCol/60 dark:border-white/10">
                  <span className="text-xs sm:text-sm text-muted">Jumlah yang harus dibayar</span>
                  <span className="text-xl sm:text-2xl font-extrabold text-ink dark:text-white">
                    Rp {parseInt(total).toLocaleString('id-ID')}
                  </span>
                </div>

                {/* Action Area */}
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={midtransLoading}
                    onClick={handlePayWithMidtrans}
                    className="w-full py-3.5 px-4 bg-primary hover:bg-primary-dark text-white text-sm font-bold rounded-input flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {midtransLoading ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Membuka Midtrans Snap...</span>
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        <span>Bayar via E-Wallet</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Card 5: Kartu Kredit / Debit */}
            {selectedMethod === 'card' && (
              <div className="bg-white dark:bg-[#102434] border border-borderCol dark:border-white/10 rounded-card p-3.5 sm:p-6 shadow-2xs space-y-3.5 sm:space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-base font-bold text-ink dark:text-white flex items-center gap-2">
                    <CreditCard size={18} className="text-primary" />
                    <span>Kartu Kredit / Debit</span>
                  </h2>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/10 text-success border border-success/30 text-xs font-semibold">
                    <ShieldCheck size={13} />
                    <span>Enkripsi 256-bit Aman</span>
                  </span>
                </div>

                {/* Card Inputs */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-ink dark:text-white mb-1">
                      Nomor Kartu Kredit / Debit
                    </label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="Contoh: 4000 1234 5678 9010"
                      className="w-full h-11 px-3.5 border border-borderCol dark:border-white/10 rounded-input text-sm font-mono font-bold text-ink dark:text-white bg-surface dark:bg-white/5 outline-none focus:border-primary focus:bg-white transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-ink dark:text-white mb-1">Masa Berlaku</label>
                      <input
                        type="text"
                        value={cardExp}
                        onChange={(e) => setCardExp(e.target.value)}
                        placeholder="MM/YY"
                        className="w-full h-11 px-3.5 border border-borderCol dark:border-white/10 rounded-input text-sm font-mono font-semibold text-ink dark:text-white bg-surface dark:bg-white/5 outline-none focus:border-primary focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-ink dark:text-white mb-1">CVV</label>
                      <input
                        type="password"
                        maxLength={4}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        placeholder="123"
                        className="w-full h-11 px-3.5 border border-borderCol dark:border-white/10 rounded-input text-sm font-mono font-semibold text-ink dark:text-white bg-surface dark:bg-white/5 outline-none focus:border-primary focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Amount to pay */}
                <div className="flex items-center justify-between py-2 border-b border-borderCol/60 dark:border-white/10">
                  <span className="text-xs sm:text-sm text-muted">Jumlah yang harus dibayar (pas)</span>
                  <span className="text-xl sm:text-2xl font-extrabold text-ink dark:text-white">
                    Rp {parseInt(total).toLocaleString('id-ID')}
                  </span>
                </div>

                {/* Action Area */}
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={midtransLoading}
                    onClick={handlePayWithMidtrans}
                    className="w-full py-3.5 px-4 bg-primary hover:bg-primary-dark text-white text-sm font-bold rounded-input flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {midtransLoading ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Memproses Pembayaran...</span>
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        <span>Bayar dengan Kartu</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="w-full sm:w-auto px-5 py-2.5 border border-primary text-primary hover:bg-primary-tint/30 text-sm font-bold rounded-input flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <ArrowLeft size={16} />
                <span>Kembali ke review</span>
              </button>
            </div>
          </div>

          {/* Right Column: Ringkasan Pembayaran */}
          <div className="w-full lg:w-80 flex-shrink-0 space-y-3.5 sm:space-y-4">
            <div className="bg-white dark:bg-[#102434] border border-borderCol dark:border-white/10 rounded-card p-4 sm:p-5 shadow-2xs space-y-3">
              <h3 className="font-extrabold text-sm text-ink dark:text-white">Rincian Perjalanan</h3>
              <div className="space-y-1.5 text-xs text-muted dark:text-gray-400">
                <div className="flex justify-between">
                  <span>Rute</span>
                  <strong className="text-ink dark:text-white">{from} → {to}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Tanggal</span>
                  <strong className="text-ink dark:text-white">{dateStr}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Jam Berangkat</span>
                  <strong className="text-ink dark:text-white">{dep} WIB</strong>
                </div>
                <div className="flex justify-between">
                  <span>Bus</span>
                  <strong className="text-ink dark:text-white">{bus}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Kelas</span>
                  <strong className="text-ink dark:text-white">{cls}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Kursi</span>
                  <strong className="text-ink dark:text-white">{seatsParam}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Penumpang</span>
                  <strong className="text-ink dark:text-white truncate max-w-[140px] text-right">
                    {passengerNames}
                  </strong>
                </div>
              </div>

              <div className="border-t border-borderCol/60 dark:border-white/10 pt-3 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted">Total Tiket</span>
                  <span className="font-bold text-ink dark:text-white">Rp {parseInt(total).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Biaya Layanan</span>
                  <span className="font-bold text-success">Gratis</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-ink dark:text-white pt-2 border-t border-borderCol/60 dark:border-white/10">
                  <span>Total Bayar</span>
                  <span className="text-primary text-base font-black">
                    Rp {parseInt(total).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-surface dark:bg-white/5 border border-borderCol dark:border-white/10 space-y-2 text-[11px] text-muted dark:text-gray-400">
              <div className="flex items-center gap-1.5 font-bold text-ink dark:text-white">
                <ShieldCheck size={14} className="text-primary" />
                <span>Transaksi Dijamin Aman</span>
              </div>
              <p>
                Semua transaksi diproses melalui gateway resmi Midtrans dengan enkripsi standar industri.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function PaymentPage({
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
  }>
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface p-8 text-center text-muted">Memuat halaman pembayaran...</div>}>
      <PaymentContent params={params} searchParams={searchParams} />
    </Suspense>
  )
}
