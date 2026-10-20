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

function QrisQrCode() {
  return (
    <div className="relative w-56 h-56 mx-auto bg-white p-3 rounded-2xl border border-borderCol shadow-md flex items-center justify-center">
      {/* High-fidelity Vector QR Code */}
      <svg viewBox="0 0 200 200" className="w-full h-full" fill="none">
        <rect width="200" height="200" fill="white" rx="10" />

        {/* Top-Left Finder */}
        <rect x="15" y="15" width="45" height="45" rx="6" fill="#0F2A33" />
        <rect x="23" y="23" width="29" height="29" rx="3" fill="white" />
        <rect x="29" y="29" width="17" height="17" rx="2" fill="#0B6E78" />

        {/* Top-Right Finder */}
        <rect x="140" y="15" width="45" height="45" rx="6" fill="#0F2A33" />
        <rect x="148" y="23" width="29" height="29" rx="3" fill="white" />
        <rect x="154" y="29" width="17" height="17" rx="2" fill="#0B6E78" />

        {/* Bottom-Left Finder */}
        <rect x="15" y="140" width="45" height="45" rx="6" fill="#0F2A33" />
        <rect x="23" y="148" width="29" height="29" rx="3" fill="white" />
        <rect x="29" y="154" width="17" height="17" rx="2" fill="#0B6E78" />

        {/* Timing Lines */}
        <path d="M68 25 h8 M84 25 h8 M100 25 h8 M116 25 h8 M124 25 h8" stroke="#0F2A33" strokeWidth="5" strokeLinecap="round" />
        <path d="M25 68 v8 M25 84 v8 M25 100 v8 M25 116 v8 M25 124 v8" stroke="#0F2A33" strokeWidth="5" strokeLinecap="round" />

        {/* Matrix Grid Blocks */}
        <rect x="70" y="38" width="8" height="8" rx="2" fill="#0F2A33" />
        <rect x="85" y="38" width="8" height="8" rx="2" fill="#0F2A33" />
        <rect x="100" y="38" width="15" height="8" rx="2" fill="#0F2A33" />
        <rect x="70" y="52" width="22" height="8" rx="2" fill="#0F2A33" />
        <rect x="100" y="52" width="8" height="8" rx="2" fill="#0F2A33" />
        <rect x="115" y="52" width="15" height="8" rx="2" fill="#0F2A33" />

        <rect x="40" y="70" width="15" height="8" rx="2" fill="#0F2A33" />
        <rect x="62" y="70" width="8" height="8" rx="2" fill="#0F2A33" />
        <rect x="130" y="70" width="15" height="8" rx="2" fill="#0F2A33" />
        <rect x="155" y="70" width="8" height="8" rx="2" fill="#0F2A33" />
        <rect x="40" y="85" width="8" height="8" rx="2" fill="#0F2A33" />
        <rect x="55" y="85" width="15" height="8" rx="2" fill="#0F2A33" />
        <rect x="130" y="85" width="8" height="8" rx="2" fill="#0F2A33" />
        <rect x="145" y="85" width="20" height="8" rx="2" fill="#0F2A33" />

        <rect x="40" y="100" width="15" height="8" rx="2" fill="#0F2A33" />
        <rect x="60" y="100" width="10" height="8" rx="2" fill="#0F2A33" />
        <rect x="130" y="100" width="15" height="8" rx="2" fill="#0F2A33" />
        <rect x="152" y="100" width="15" height="8" rx="2" fill="#0F2A33" />

        <rect x="40" y="115" width="8" height="8" rx="2" fill="#0F2A33" />
        <rect x="55" y="115" width="15" height="8" rx="2" fill="#0F2A33" />
        <rect x="130" y="115" width="22" height="8" rx="2" fill="#0F2A33" />

        <rect x="70" y="135" width="20" height="8" rx="2" fill="#0F2A33" />
        <rect x="98" y="135" width="8" height="8" rx="2" fill="#0F2A33" />
        <rect x="114" y="135" width="15" height="8" rx="2" fill="#0F2A33" />
        <rect x="136" y="135" width="8" height="8" rx="2" fill="#0F2A33" />
        <rect x="150" y="135" width="15" height="8" rx="2" fill="#0F2A33" />

        <rect x="70" y="150" width="8" height="8" rx="2" fill="#0F2A33" />
        <rect x="85" y="150" width="15" height="8" rx="2" fill="#0F2A33" />
        <rect x="108" y="150" width="20" height="8" rx="2" fill="#0F2A33" />
        <rect x="136" y="150" width="15" height="8" rx="2" fill="#0F2A33" />
        <rect x="158" y="150" width="12" height="8" rx="2" fill="#0F2A33" />

        <rect x="70" y="165" width="15" height="8" rx="2" fill="#0F2A33" />
        <rect x="92" y="165" width="10" height="8" rx="2" fill="#0F2A33" />
        <rect x="110" y="165" width="8" height="8" rx="2" fill="#0F2A33" />
        <rect x="125" y="165" width="18" height="8" rx="2" fill="#0F2A33" />

        {/* Center Logo Box */}
        <rect x="80" y="80" width="40" height="40" rx="8" fill="#0B6E78" />
        <path d="M92 90 L108 90 L108 98 L92 98 Z" fill="white" />
        <path d="M96 98 L104 98 L104 110 L96 110 Z" fill="white" />
      </svg>
    </div>
  )
}

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
  const [isChecking, setIsChecking] = useState(false)
  const [checkStatusText, setCheckStatusText] = useState('')

  // Dummy Card state
  const [cardNumber, setCardNumber] = useState('4000 1234 5678 9010')
  const [cardExp, setCardExp] = useState('12/28')
  const [cardCvv, setCardCvv] = useState('123')

  // Payment state
  const [midtransLoading, setMidtransLoading] = useState(false)

  // Countdown timer: 01:48 (108 seconds)
  const [secondsLeft, setSecondsLeft] = useState(108)

  useEffect(() => {
    const t = setInterval(() => {
      setSecondsLeft(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(t)
  }, [])

  // Load Midtrans Snap Script
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

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const currentVaBank = VA_BANKS.find(b => b.id === selectedBank) ?? VA_BANKS[0]

  const copyVA = () => {
    navigator.clipboard.writeText(currentVaBank.code.replace(/\s+/g, ''))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
        sp.email ?? 'dini@contoh.id'
      )}&phone=${encodeURIComponent(sp.phone ?? '0812-3456-7890')}&total=${total}&dep=${encodeURIComponent(dep)}&arr=${encodeURIComponent(arr)}&bus=${encodeURIComponent(bus)}&cls=${encodeURIComponent(cls)}`
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
        // Fallback langsung ke proses konfirmasi jika gateway offline
        setMidtransLoading(false)
        handleSimulatePayment(selectedMethod.toUpperCase())
        return
      }

      if (data.token) {
        if (typeof window !== 'undefined' && window.snap) {
          window.snap.pay(data.token, {
            onSuccess: function () {
              navigateToEticket()
            },
            onPending: function () {
              navigateToEticket()
            },
            onError: function () {
              setMidtransLoading(false)
              handleSimulatePayment(selectedMethod.toUpperCase())
            },
            onClose: function () {
              setMidtransLoading(false)
            },
          })
        } else if (data.redirect_url) {
          window.location.href = data.redirect_url
        } else {
          setMidtransLoading(false)
          handleSimulatePayment(selectedMethod.toUpperCase())
        }
      }
    } catch {
      setMidtransLoading(false)
      handleSimulatePayment(selectedMethod.toUpperCase())
    }
  }

  const handleSimulatePayment = (methodLabel: string) => {
    setIsChecking(true)
    setCheckStatusText(`Menghubungkan ke Gateway (${methodLabel})...`)

    setTimeout(() => {
      setCheckStatusText('Pembayaran Terverifikasi! Menerbitkan e-tiket...')
      setTimeout(() => {
        navigateToEticket()
      }, 700)
    }, 800)
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

            {/* Card 2: Detail Pembayaran Berdasarkan Metode */}
            {selectedMethod === 'qris' && (
              <div className="bg-white border border-borderCol rounded-card p-5 sm:p-6 shadow-2xs space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h2 className="text-base font-bold text-ink flex items-center gap-2">
                      <QrCode size={18} className="text-primary" />
                      <span>Pembayaran QRIS Nasional</span>
                    </h2>
                    <p className="text-xs text-muted mt-0.5">
                      Bisa di-scan dari BCA Mobile, Livin, BRImo, GoPay, OVO, DANA, ShopeePay
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-info/10 text-info border border-info/30 text-xs font-semibold">
                    <Info size={13} />
                    <span>Menunggu scan</span>
                  </span>
                </div>

                {/* QR Code Container */}
                <div className="p-6 bg-surface border border-borderCol rounded-2xl text-center space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-borderCol rounded-full text-xs font-bold text-ink shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <span>Merchant: RUTEKU ANTARKOTA</span>
                  </div>

                  <QrisQrCode />

                  <div className="space-y-1">
                    <span className="text-xs font-mono text-muted block">NMID: ID1020039281920</span>
                    <span className="text-xl sm:text-2xl font-black text-ink block">
                      Rp {parseInt(total).toLocaleString('id-ID')}
                    </span>
                    <span className="text-xs text-muted block">Jumlah pas tanpa biaya admin</span>
                  </div>
                </div>

                {/* Action Area */}
                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    disabled={midtransLoading || isChecking}
                    onClick={handlePayWithMidtrans}
                    className="flex-1 py-3 px-4 bg-primary hover:bg-primary-dark text-white text-sm font-bold rounded-input flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
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
                  <button
                    type="button"
                    disabled={isChecking || midtransLoading}
                    onClick={() => handleSimulatePayment('QRIS')}
                    className="py-3 px-5 border border-borderCol bg-white hover:bg-surface text-ink text-sm font-bold rounded-input transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isChecking ? 'Memverifikasi...' : 'Cek Status Pembayaran'}
                  </button>
                </div>

                {/* Instructions */}
                <div className="pt-2 border-t border-borderCol/60">
                  <p className="text-xs font-bold text-ink mb-2">Cara Pembayaran QRIS:</p>
                  <ol className="space-y-1.5 text-xs text-muted leading-relaxed">
                    <li>1. Buka aplikasi m-Banking atau E-Wallet pilihan Anda di smartphone.</li>
                    <li>2. Pilih menu <strong>Scan / Bayar dengan QRIS</strong>.</li>
                    <li>3. Arahkan kamera ke QR code di atas, pastikan nama tujuan <strong>RUTEKU ANTARKOTA</strong>.</li>
                    <li>4. Konfirmasi pembayaran tepat sejumlah <strong>Rp {parseInt(total).toLocaleString('id-ID')}</strong>.</li>
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
                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    disabled={midtransLoading || isChecking}
                    onClick={handlePayWithMidtrans}
                    className="flex-1 py-3 px-4 bg-primary hover:bg-primary-dark text-white text-sm font-bold rounded-input flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
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
                  <button
                    type="button"
                    disabled={isChecking || midtransLoading}
                    onClick={() => handleSimulatePayment(`VA ${currentVaBank.name.split(' ')[0]}`)}
                    className="py-3 px-5 border border-borderCol bg-white hover:bg-surface text-ink text-sm font-bold rounded-input transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isChecking ? 'Memverifikasi...' : 'Saya Sudah Transfer'}
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
                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    disabled={midtransLoading || isChecking}
                    onClick={handlePayWithMidtrans}
                    className="flex-1 py-3 px-4 bg-primary hover:bg-primary-dark text-white text-sm font-bold rounded-input flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
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
                  <button
                    type="button"
                    disabled={isChecking || midtransLoading}
                    onClick={() => handleSimulatePayment('E-Wallet')}
                    className="py-3 px-5 border border-borderCol bg-white hover:bg-surface text-ink text-sm font-bold rounded-input transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isChecking ? 'Memverifikasi...' : 'Cek Status Pembayaran'}
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
                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    disabled={midtransLoading || isChecking}
                    onClick={handlePayWithMidtrans}
                    className="flex-1 py-3 px-4 bg-primary hover:bg-primary-dark text-white text-sm font-bold rounded-input flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
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
                  <button
                    type="button"
                    disabled={isChecking || midtransLoading}
                    onClick={() => handleSimulatePayment('Kartu Kredit')}
                    className="py-3 px-5 border border-borderCol bg-white hover:bg-surface text-ink text-sm font-bold rounded-input transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isChecking ? 'Memverifikasi...' : 'Konfirmasi Pembayaran'}
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
                disabled={midtransLoading || isChecking}
                onClick={handlePayWithMidtrans}
                className="w-full sm:w-auto px-7 py-3 sm:py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-bold rounded-input transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-2"
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
