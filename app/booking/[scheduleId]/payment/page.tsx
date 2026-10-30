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
  ShieldCheck,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'

const PAYMENT_METHODS = [
  { id: 'qris', label: 'QRIS Sandbox Midtrans', sub: 'Bayar melalui Midtrans QRIS Simulator' },
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
  const selectedMethod = 'qris'

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

  // Countdown timer: 15 menit (900 detik)
  const [secondsLeft, setSecondsLeft] = useState(900)

  useEffect(() => {
    const t = setInterval(() => {
      setSecondsLeft(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(t)
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

  const [currentBooking, setCurrentBooking] = useState<{
    id: string
    code: string
    publicToken: string
    grandTotal: number
  } | null>(null)

  // Generate QRIS via Midtrans Core API (Nominal strictly from Database grand_total)
  const handleGenerateQris = async () => {
    setQrisLoading(true)
    setQrisError('')
    setQrisData(null)
    setQrisStatus('pending')

    try {
      let activeBooking = currentBooking

      // 1. Pastikan booking sudah tersimpan di database sebelum meminta pembayaran
      if (!activeBooking) {
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
                fullName: passengerNames?.split(',')[0]?.trim() || 'Penumpang RuteKu',
                passengerType: 'adult',
              }))

        const createBookingRes = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scheduleId,
            seats: seatList,
            passengers: passengersPayload,
            contactName: (passengerNames?.split(',')[0] || 'Penumpang RuteKu').trim(),
            contactEmail: (sp.email || 'customer@ruteku.id').trim(),
            contactPhone: (sp.phone || '081234567890').trim(),
          }),
        })

        const bookingData = await createBookingRes.json()
        if (!createBookingRes.ok || !bookingData.booking) {
          throw new Error(bookingData.error || 'Gagal menyimpan data pesanan.')
        }

        activeBooking = bookingData.booking
        setCurrentBooking(activeBooking)
      }

      // 2. Minta QRIS berdasarkan database booking (nominal diambil otomatis dari grand_total di DB)
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
    const targetEmail = sp.email
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
        sp.email ?? ''
      )}&phone=${encodeURIComponent(sp.phone ?? '')}&total=${total}&dep=${encodeURIComponent(dep)}&arr=${encodeURIComponent(arr)}&bus=${encodeURIComponent(bus)}&cls=${encodeURIComponent(cls)}&code=${dynamicCode}&publicToken=${publicToken}`
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

        {/* Amber Alert Banner */}
        <div className="mb-3.5 sm:mb-6 p-3 sm:p-4 rounded-xl bg-[#FEF6EE] dark:bg-[#2A1805]/80 border border-[#F9DBAF] dark:border-[#7A3E08] text-[#93370D] dark:text-[#FDB022] flex items-start gap-3 shadow-2xs">
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
        <div className="flex flex-col lg:flex-row gap-3.5 sm:gap-6 items-start">
          {/* Left Column */}
          <div className="flex-1 w-full space-y-3.5 sm:space-y-6">
            {/* Card 1: Pilih Metode Pembayaran */}
            <div className="bg-white border border-borderCol rounded-card p-3.5 sm:p-6 shadow-2xs">
              <h2 className="text-base font-bold text-ink mb-2.5 sm:mb-4">Pilih metode pembayaran</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PAYMENT_METHODS.map(m => {
                  const isSel = selectedMethod === m.id
                  return (
                    <div
                      key={m.id}
                      className={`flex items-start justify-between p-3.5 rounded-xl border transition-all ${
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
              <div className="bg-white border border-borderCol rounded-card p-3.5 sm:p-6 shadow-2xs space-y-3.5 sm:space-y-5">
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

          {/* Right Column */}
          <div className="w-full lg:w-80 flex-shrink-0 space-y-3 sm:space-y-4">
            {/* Amber Timer Card */}
            <div className="bg-[#FEF6EE] dark:bg-[#2A1805]/80 border border-[#F9DBAF] dark:border-[#7A3E08] rounded-card p-3.5 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#93370D] dark:text-[#FDB022]">Sisa waktu tahan</span>
                <span className="text-2xl sm:text-3xl font-mono font-extrabold text-[#7A271A] dark:text-[#FEDF89] tracking-tight">
                  {fmtTime(secondsLeft)}
                </span>
              </div>
              <p className="text-[11px] text-[#93370D]/80 dark:text-[#FDB022]/80 mt-1">
                Selesaikan pembayaran sebelum batas waktu berakhir.
              </p>
            </div>

            {/* Keamanan Transaksi Card */}
            <div className="bg-white border border-borderCol rounded-card p-3.5 sm:p-4 shadow-2xs space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-success" />
                <span className="text-xs font-bold text-ink">Jaminan Pembayaran Aman</span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Semua transaksi terenkripsi secara otomatis melalui gateway pembayaran resmi berstandar perbankan.
              </p>
            </div>

            {/* Trip Summary Card */}
            <div className="bg-white border border-borderCol rounded-card p-3.5 sm:p-5 shadow-2xs space-y-3 sm:space-y-4">
              <div>
                <h3 className="font-black text-ink text-base">
                  {from} → {to}
                </h3>
                {sp.dur && (
                  <p className="text-[11px] text-muted font-medium mt-0.5">
                    {sp.dur}
                  </p>
                )}
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
