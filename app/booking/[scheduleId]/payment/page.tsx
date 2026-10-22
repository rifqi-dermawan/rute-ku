'use client'

import { use, useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Stepper from '@/components/Stepper'
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
} from 'lucide-react'

declare global {
  interface Window {
    snap?: any
  }
}

const PAYMENT_METHODS = [
  { id: 'qris', label: 'QRIS', sub: 'Scan dari GoPay, OVO, Dana, BCA, dll' },
  { id: 'va', label: 'Virtual Account', sub: 'BCA, Mandiri, BNI, BRI' },
  { id: 'ewallet', label: 'E-wallet', sub: 'Bayar via aplikasi digital' },
  { id: 'card', label: 'Kartu kredit / debit', sub: 'Visa, Mastercard, JCB' },
]

const VA_BANKS = [
  { id: 'bca', name: 'BCA Virtual Account', code: '8277 0812 3456 7890' },
  { id: 'mandiri', name: 'Mandiri Bill Payment', code: '8870 8123 4567 8901' },
  { id: 'bni', name: 'BNI Virtual Account', code: '8241 0812 3456 7890' },
  { id: 'bri', name: 'BRIVA (BRI)', code: '8021 0812 3456 7890' },
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

  const router = useRouter()
  const [selectedMethod, setSelectedMethod] = useState('qris')
  const [selectedBank, setSelectedBank] = useState('bca')
  const [selectedEwallet, setSelectedEwallet] = useState('gopay')
  const [copied, setCopied] = useState(false)
  const [midtransError, setMidtransError] = useState('')

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

  // Dummy Card state
  const [cardNumber, setCardNumber] = useState('4000 1234 5678 9010')
  const [cardExp, setCardExp] = useState('12/28')
  const [cardCvv, setCardCvv] = useState('123')

  // Payment state (for non-QRIS tabs / Snap)
  const [midtransLoading, setMidtransLoading] = useState(false)

  // Countdown timer: 15 menit (900 detik)
  const [secondsLeft, setSecondsLeft] = useState(900)

  useEffect(() => {
    const t = setInterval(() => {
      setSecondsLeft(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(t)
  }, [])

  // Load Midtrans Snap Script (for other tabs)
  useEffect(() => {
    const snapScriptUrl = 'https://app.sandbox.midtrans.com/snap/snap.js'
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || ''

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
        const s: 'pending' | 'paid' | 'expired' | 'failed' = json.status ?? 'pending'
        setQrisStatus(s)
        if (s === 'paid') {
          clearInterval(poll)
          navigateToEticket()
        } else if (s === 'expired' || s === 'failed') {
          clearInterval(poll)
          setQrisError(s === 'expired' ? 'QR Code telah kedaluwarsa. Buat QR baru.' : 'Pembayaran gagal atau dibatalkan.')
          setQrisData(null)
        }
      } catch {
        // polling error - abaikan, coba lagi di interval berikutnya
      }
    }, 3000)

    return () => clearInterval(poll)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrisData, qrisStatus])

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const currentVaBank = VA_BANKS.find(b => b.id === selectedBank) ?? VA_BANKS[0]

  const copyVA = () => {
    navigator.clipboard.writeText(currentVaBank.code.replace(/\s+/g, ''))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Generate QRIS via Midtrans Core API
  const handleGenerateQris = async () => {
    setQrisLoading(true)
    setQrisError('')
    setQrisData(null)
    setQrisStatus('pending')

    try {
      const orderId = `RUTEKU-QRIS-${scheduleId}-${Date.now().toString().slice(-8)}`
      const res = await fetch('/api/payment/qris', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          grossAmount: parseInt(total) || 100000,
          customerDetails: {
            first_name: passengerNames ? passengerNames.split(',')[0].trim() : 'Penumpang RuteKu',
            email: sp.email || 'customer@ruteku.id',
            phone: sp.phone || '081234567890',
          },
          itemDetails: [
            {
              id: scheduleId,
              price: parseInt(total) || 100000,
              quantity: 1,
              name: `Tiket Bus ${bus} (${cls}) ${from} – ${to}`.slice(0, 50),
            },
          ],
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.qrUrl) {
        setQrisError(data.error || 'Gagal membuat QR Code. Silakan coba lagi.')
        setQrisLoading(false)
        return
      }

      setQrisData(data)
    } catch {
      setQrisError('Terjadi kendala koneksi saat membuat QR Code.')
    } finally {
      setQrisLoading(false)
    }
  }

  const navigateToEticket = () => {
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

    router.push(
      `/booking/${scheduleId}/eticket?seats=${seatsParam}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${encodeURIComponent(
        dateStr
      )}&passengersData=${encodeURIComponent(rawPassengers)}&email=${encodeURIComponent(
        sp.email ?? ''
      )}&phone=${encodeURIComponent(sp.phone ?? '')}&total=${total}&dep=${encodeURIComponent(dep)}&arr=${encodeURIComponent(arr)}&bus=${encodeURIComponent(bus)}&cls=${encodeURIComponent(cls)}`
    )
  }

  const handlePayWithMidtrans = async () => {
    setMidtransLoading(true)

    try {
      const res = await fetch('/api/payment/midtrans/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: `RUTEKU-${scheduleId}-${Date.now().toString().slice(-6)}`,
          grossAmount: parseInt(total) || 100000,
          customerDetails: {
            first_name: passengerNames ? passengerNames.split(',')[0].trim() : 'Penumpang RuteKu',
            email: sp.email || 'customer@ruteku.id',
            phone: sp.phone || '081234567890',
          },
          itemDetails: [
            {
              id: scheduleId,
              price: parseInt(total) || 100000,
              quantity: 1,
              name: `Tiket Bus ${bus} (${cls}) ${from} - ${to}`.slice(0, 50),
            },
          ],
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.token) {
        setMidtransLoading(false)
        setMidtransError(data.error || 'Gagal menghubungkan ke gateway pembayaran. Silakan coba sesaat lagi.')
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
          setMidtransError('Gateway pembayaran Midtrans tidak dapat dimuat. Pastikan koneksi internet aktif.')
        }
      }
    } catch {
      setMidtransLoading(false)
      setMidtransError('Terjadi kendala koneksi saat menghubungi server pembayaran.')
    }
  }

  return (
    <div className="min-h-screen bg-surface pb-20">
      <Stepper currentStep={5} />

      <main className="max-w-6xl mx-auto px-3.5 sm:px-8 py-5 sm:py-8">
        {/* Title */}
        <div className="mb-5">
          <h1 className="text-xl sm:text-3xl font-black text-ink tracking-tight">
            Pembayaran
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-0.5">
            Selesaikan sebelum timer habis agar kursi {seatsParam} tidak dilepas.
          </p>
        </div>


        {/* Error Banner jika terjadi kendala gateway */}
        {midtransError && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 text-xs sm:text-sm flex items-start gap-3 shadow-2xs">
            <AlertCircle size={18} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <strong className="font-bold text-red-950 dark:text-red-100">Kendala Pembayaran</strong>
              <p className="text-red-800 dark:text-red-300/90">{midtransError}</p>
            </div>
          </div>
        )}

        {/* Amber Alert Banner */}
        <div className="mb-6 p-4 rounded-xl bg-[#FEF6EE] dark:bg-[#2A1805]/80 border border-[#F9DBAF] dark:border-[#7A3E08] text-[#93370D] dark:text-[#FDB022] flex items-start gap-3 shadow-2xs">
          <Clock size={18} className="text-[#93370D] dark:text-[#FDB022] flex-shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm leading-relaxed">
            <strong className="font-bold text-[#7A271A] dark:text-[#FEDF89]">
              Waktu tinggal {fmtTime(secondsLeft).replace(':', ' menit ')} detik
            </strong>
            <p className="text-[#93370D] dark:text-[#FDB022]/90 mt-0.5">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PAYMENT_METHODS.map(m => {
                  const isSel = selectedMethod === m.id
                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMethod(m.id)}
                      className={`flex items-start justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSel
                          ? 'border-primary bg-primary-tint/40 shadow-xs ring-1 ring-primary/30'
                          : 'border-borderCol hover:border-primary/40 bg-white'
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
                          <span className="font-bold text-sm text-ink block leading-snug">{m.label}</span>
                          {m.sub && (
                            <span className="text-[11px] text-muted font-medium block mt-0.5">{m.sub}</span>
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

            {/* Card 2: QRIS Tab — QR Real dari Midtrans */}
            {selectedMethod === 'qris' && (
              <div className="bg-white border border-borderCol rounded-card p-5 sm:p-6 shadow-2xs space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h2 className="text-base font-bold text-ink flex items-center gap-2">
                      <QrCode size={18} className="text-primary" />
                      <span>Pembayaran QRIS Sandbox</span>
                    </h2>
                    <p className="text-xs text-muted mt-0.5">
                      QR Code langsung dari Midtrans Sandbox — scan di QRIS Simulator
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                    qrisStatus === 'paid'
                      ? 'bg-success/10 text-success border-success/30'
                      : qrisStatus === 'expired' || qrisStatus === 'failed'
                      ? 'bg-red-50 text-red-600 border-red-200'
                      : qrisData
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-info/10 text-info border-info/30'
                  }`}>
                    <Info size={13} />
                    <span>
                      {qrisStatus === 'paid' ? 'Lunas!' :
                       qrisStatus === 'expired' ? 'QR Kedaluwarsa' :
                       qrisStatus === 'failed' ? 'Gagal' :
                       qrisData ? 'Menunggu scan…' : 'Belum dibuat'}
                    </span>
                  </span>
                </div>

                {/* QR Container */}
                <div className="p-5 bg-surface border border-borderCol rounded-2xl text-center space-y-4">
                  {!qrisData && !qrisLoading && (
                    <div className="py-6 space-y-4">
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                        <QrCode size={32} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-ink">QR Code Belum Dibuat</p>
                        <p className="text-xs text-muted mt-1">
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
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-borderCol rounded-full text-xs font-bold text-ink shadow-2xs">
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
                        <span className="text-xl sm:text-2xl font-black text-ink block">
                          Rp {qrisData.amount.toLocaleString('id-ID')}
                        </span>
                        <span className="text-xs text-muted block">Jumlah pas tanpa biaya admin</span>
                      </div>

                      {/* Tombol salin URL QR — hanya untuk testing sandbox */}
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(qrisData.qrUrl)
                          setQrisCopied(true)
                          setTimeout(() => setQrisCopied(false), 2500)
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-borderCol rounded-lg bg-white hover:border-primary hover:text-primary transition-all cursor-pointer"
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
                <div className="pt-2">
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
                    <div className="text-center text-xs text-muted py-2">
                      Scan QR di atas, lalu kunjungi{' '}
                      <a
                        href="https://simulator.sandbox.midtrans.com/v2/qris/index"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary font-semibold hover:underline"
                      >
                        QRIS Simulator
                      </a>{' '}
                      untuk menyelesaikan pembayaran.
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <div className="pt-2 border-t border-borderCol/60">
                  <p className="text-xs font-bold text-ink mb-2">Cara Pembayaran QRIS Sandbox:</p>
                  <ol className="space-y-1.5 text-xs text-muted leading-relaxed">
                    <li>1. Klik <strong>Buat QR Code QRIS</strong> di atas untuk mendapatkan QR dari Midtrans.</li>
                    <li>2. Klik <strong>Salin URL QR</strong>, lalu buka{' '}
                      <a href="https://simulator.sandbox.midtrans.com/v2/qris/index" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:underline">QRIS Simulator Midtrans</a>.
                    </li>
                    <li>3. Tempel URL, tekan tombol scan, lalu selesaikan sebagai <strong>sukses</strong>.</li>
                    <li>4. Halaman akan otomatis berpindah ke e-tiket dalam beberapa detik.</li>
                  </ol>
                </div>
              </div>
            )}

            {selectedMethod === 'va' && (
              <div className="bg-white border border-borderCol rounded-card p-5 sm:p-6 shadow-2xs space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-base font-bold text-ink flex items-center gap-2">
                    <Building2 size={18} className="text-primary" />
                    <span>Transfer ke Virtual Account</span>
                  </h2>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-info/10 text-info border border-info/30 text-xs font-semibold">
                    <Info size={13} />
                    <span>Menunggu transfer</span>
                  </span>
                </div>

                {/* Bank Selector */}
                <div>
                  <label className="block text-xs font-bold text-ink mb-2">Pilih Bank</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {VA_BANKS.map(b => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelectedBank(b.id)}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                          selectedBank === b.id
                            ? 'border-primary bg-primary-tint/50 text-primary ring-1 ring-primary/40'
                            : 'border-borderCol bg-white text-ink hover:border-primary/40'
                        }`}
                      >
                        {b.name.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Virtual Account Box */}
                <div className="p-4 bg-surface border border-borderCol rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1">
                      {currentVaBank.name.toUpperCase()}
                    </span>
                    <span className="text-xl sm:text-2xl font-mono font-bold text-ink tracking-wider">
                      {currentVaBank.code}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={copyVA}
                    className="px-4 py-2 border border-borderCol bg-white hover:border-primary hover:text-primary rounded-input text-xs font-bold text-ink flex items-center gap-1.5 self-start sm:self-auto transition-all shadow-2xs cursor-pointer"
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
                <div className="flex items-center justify-between py-2 border-b border-borderCol/60">
                  <span className="text-xs sm:text-sm text-muted">Jumlah yang harus dibayar (pas)</span>
                  <span className="text-xl sm:text-2xl font-extrabold text-ink">
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
                        <span>Bayar Sekarang</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {selectedMethod === 'ewallet' && (
              <div className="bg-white border border-borderCol rounded-card p-5 sm:p-6 shadow-2xs space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-base font-bold text-ink flex items-center gap-2">
                    <Smartphone size={18} className="text-primary" />
                    <span>Pembayaran E-Wallet</span>
                  </h2>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-info/10 text-info border border-info/30 text-xs font-semibold">
                    <Info size={13} />
                    <span>Menunggu konfirmasi</span>
                  </span>
                </div>

                {/* E-Wallet Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {EWALLET_LIST.map(w => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setSelectedEwallet(w.id)}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        selectedEwallet === w.id
                          ? 'border-primary bg-primary-tint/50 text-primary ring-1 ring-primary/40'
                          : 'border-borderCol bg-white text-ink hover:border-primary/40'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full ${w.color}`} />
                      <span>{w.name}</span>
                    </button>
                  ))}
                </div>

                {/* Phone Number Field */}
                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5">Nomor Handphone Terdaftar</label>
                  <input
                    type="text"
                    defaultValue={sp.phone ?? '0812-3456-7890'}
                    className="w-full h-11 px-3.5 border border-borderCol rounded-input text-sm font-semibold text-ink bg-surface outline-none focus:border-primary"
                    placeholder="Contoh: 081234567890"
                  />
                  <p className="text-[11px] text-muted mt-1">
                    Notifikasi persetujuan bayar akan dikirim ke aplikasi e-wallet Anda.
                  </p>
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
                        <span>Bayar Sekarang</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {selectedMethod === 'card' && (
              <div className="bg-white border border-borderCol rounded-card p-5 sm:p-6 shadow-2xs space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-base font-bold text-ink flex items-center gap-2">
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
                    <label className="block text-xs font-bold text-ink mb-1">Nomor Kartu Kredit / Debit</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={e => setCardNumber(e.target.value)}
                      className="w-full h-11 px-3.5 border border-borderCol rounded-input text-sm font-mono font-bold text-ink bg-surface outline-none focus:border-primary"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-ink mb-1">Masa Berlaku</label>
                      <input
                        type="text"
                        value={cardExp}
                        onChange={e => setCardExp(e.target.value)}
                        className="w-full h-11 px-3.5 border border-borderCol rounded-input text-sm font-mono font-semibold text-ink bg-surface outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-ink mb-1">CVV</label>
                      <input
                        type="text"
                        value={cardCvv}
                        onChange={e => setCardCvv(e.target.value)}
                        className="w-full h-11 px-3.5 border border-borderCol rounded-input text-sm font-mono font-semibold text-ink bg-surface outline-none focus:border-primary"
                      />
                    </div>
                  </div>
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
                        <span>Bayar Sekarang</span>
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

              <button
                type="button"
                disabled={midtransLoading}
                onClick={handlePayWithMidtrans}
                className="w-full sm:w-auto px-7 py-3 sm:py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-bold rounded-input transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {midtransLoading ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Bayar Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column */}
          <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
            {/* Amber Timer Card */}
            <div className="bg-[#FEF6EE] dark:bg-[#2A1805]/80 border border-[#F9DBAF] dark:border-[#7A3E08] rounded-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#93370D] dark:text-[#FDB022]">Sisa waktu tahan</span>
                <span className="text-3xl font-mono font-extrabold text-[#7A271A] dark:text-[#FEDF89] tracking-tight">
                  {fmtTime(secondsLeft)}
                </span>
              </div>
              <p className="text-[11px] text-[#93370D]/80 dark:text-[#FDB022]/80 mt-1">
                Selesaikan pembayaran sebelum batas waktu berakhir.
              </p>
            </div>

            {/* Keamanan Transaksi Card */}
            <div className="bg-white border border-borderCol rounded-card p-4 shadow-2xs space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-success" />
                <span className="text-xs font-bold text-ink">Jaminan Pembayaran Aman</span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Semua transaksi terenkripsi secara otomatis melalui gateway pembayaran resmi berstandar perbankan.
              </p>
            </div>

            {/* Trip Summary Card */}
            <div className="bg-white border border-borderCol rounded-card p-5 shadow-2xs space-y-4">
              <div>
                <h3 className="font-black text-ink text-base">
                  {from} → {to}
                </h3>
                <p className="text-xs text-muted mt-1">
                  {dateStr} · {dep} – {arr}
                </p>
                <p className="text-xs text-muted">{bus} ({cls})</p>
                <p className="text-xs text-muted">Kursi {seatsParam} · {passengerNames}</p>
              </div>

              <div className="pt-3 border-t border-borderCol flex items-center justify-between">
                <span className="text-sm font-bold text-ink">Total</span>
                <span className="text-xl font-black text-ink">
                  Rp {parseInt(total).toLocaleString('id-ID')}
                </span>
              </div>

              <div className="p-3 bg-surface border border-borderCol rounded-xl text-xs text-muted space-y-1">
                <div className="flex items-center justify-between font-medium">
                  <span>Metode aktif:</span>
                  <span className="font-bold text-ink uppercase">{selectedMethod}</span>
                </div>
                <div className="flex items-center justify-between font-medium">
                  <span>Status:</span>
                  <span className="font-bold text-amber-600">Menunggu Pembayaran</span>
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
    dep?: string
    arr?: string
    dur?: string
    bus?: string
    cls?: string
    price?: string
  }>
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface p-8 text-center text-muted">Memuat pembayaran...</div>}>
      <PaymentContent {...props} />
    </Suspense>
  )
}
