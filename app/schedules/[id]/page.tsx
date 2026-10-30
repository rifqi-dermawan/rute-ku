import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ArrowLeft, Clock, Bus, MapPin, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { estimateBusDurationMinutes } from '@/lib/bus-config'
import ScheduleMapWrapper from '@/components/ScheduleMapWrapper'

export default async function ScheduleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ passengers?: string; date?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const passengers = sp.passengers || '1'

  const schedule = await prisma.schedule.findUnique({
    where: { id },
    include: {
      bus: { include: { operator: true } },
      route: { include: { originCity: true, destinationCity: true } },
      scheduleStops: {
        include: { terminal: true },
        orderBy: { stopSequence: 'asc' },
      },
      seats: true,
    },
  })

  if (!schedule) {
    notFound()
  }

  const originStop = schedule.scheduleStops.find((s) => s.stopSequence === 1)
  const destStop = schedule.scheduleStops.find((s) => s.stopSequence === 2)

  // Evaluasi Koordinat Asal: jika terminal belum terverifikasi, gunakan koordinat kota
  const originVerified = Boolean(originStop?.terminal?.coordsVerified)
  const originLat = originVerified
    ? originStop!.terminal.lat
    : schedule.route.originCity.lat || originStop?.terminal.lat || -6.2088
  const originLng = originVerified
    ? originStop!.terminal.lng
    : schedule.route.originCity.lng || originStop?.terminal.lng || 106.8456

  // Evaluasi Koordinat Tujuan: jika terminal belum terverifikasi, gunakan koordinat kota
  const destVerified = Boolean(destStop?.terminal?.coordsVerified)
  const destLat = destVerified
    ? destStop!.terminal.lat
    : schedule.route.destinationCity.lat || destStop?.terminal.lat || -6.9175
  const destLng = destVerified
    ? destStop!.terminal.lng
    : schedule.route.destinationCity.lng || destStop?.terminal.lng || 107.6191

  const originCoord = {
    name: originStop?.terminal.name || schedule.route.originCity.name,
    terminalName: originStop?.terminal.name,
    cityName: schedule.route.originCity.name,
    lat: originLat,
    lng: originLng,
    isVerified: originVerified,
  }

  const destCoord = {
    name: destStop?.terminal.name || schedule.route.destinationCity.name,
    terminalName: destStop?.terminal.name,
    cityName: schedule.route.destinationCity.name,
    lat: destLat,
    lng: destLng,
    isVerified: destVerified,
  }

  // Format durasi
  const estimatedMins = estimateBusDurationMinutes(schedule.route.osrmDurationMinutes)
  const durationHours = Math.floor(estimatedMins / 60)
  const durationMins = estimatedMins % 60
  const durationFormatted = `${durationHours}j ${durationMins > 0 ? durationMins + 'm' : ''}`.trim()

  // Format waktu WIB
  const depDate = new Date(schedule.departureTime)
  const arrDate = new Date(schedule.arrivalTime)
  const depTimeWIB = depDate.toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
  })
  const arrTimeWIB = arrDate.toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
  })
  const dateStrWIB = depDate.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const availableSeatsCount = schedule.seats.filter((s) => s.status === 'AVAILABLE').length
  const facilities = Array.isArray(schedule.bus.facilities)
    ? (schedule.bus.facilities as string[])
    : []

  const proceedUrl = `/booking/${schedule.id}/seat?passengers=${passengers}&from=${encodeURIComponent(
    schedule.route.originCity.name
  )}&to=${encodeURIComponent(
    schedule.route.destinationCity.name
  )}&date=${encodeURIComponent(dateStrWIB)}&dep=${encodeURIComponent(
    depTimeWIB
  )}&arr=${encodeURIComponent(arrTimeWIB)}&bus=${encodeURIComponent(
    schedule.bus.name
  )}&cls=${encodeURIComponent(
    schedule.bus.busClass === 'SLEEPER_2_1' ? 'Sleeper 2–1' : 'Executive 2–2'
  )}&price=${schedule.price}`

  return (
    <div className="min-h-screen bg-surface pb-20">
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Tombol Kembali */}
        <div className="flex items-center justify-between">
          <Link
            href={`/schedules?from=${encodeURIComponent(
              schedule.route.originCity.name
            )}&to=${encodeURIComponent(
              schedule.route.destinationCity.name
            )}&passengers=${passengers}`}
            className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
          >
            <ArrowLeft size={14} />
            <span>Kembali ke daftar jadwal</span>
          </Link>
          <span className="text-xs text-muted font-mono">ID: {schedule.id.slice(0, 8)}</span>
        </div>

        {/* Header Jadwal */}
        <div className="bg-white border border-borderCol rounded-2xl p-5 sm:p-6 shadow-2xs space-y-3">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2 text-primary text-xs font-bold mb-1">
                <Bus size={14} />
                <span>{schedule.bus.operator.name}</span>
                <span>•</span>
                <span className="font-mono">{schedule.bus.operator.code}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-ink">
                {schedule.route.originCity.name} → {schedule.route.destinationCity.name}
              </h1>
              <p className="text-xs text-muted mt-0.5">
                {schedule.bus.name} ·{' '}
                <span className="font-bold text-ink">
                  {schedule.bus.busClass === 'SLEEPER_2_1' ? 'Sleeper 2–1' : 'Executive 2–2'}
                </span>
              </p>
            </div>

            <div className="text-right">
              <span className="text-2xl font-black text-ink">
                Rp {schedule.price.toLocaleString('id-ID')}
              </span>
              <span className="text-xs text-muted block">/kursi</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-borderCol/60 text-xs">
            <div>
              <span className="text-muted block text-[11px]">Berangkat</span>
              <span className="font-bold text-ink text-sm">{depTimeWIB}</span>
              <span className="text-[10px] text-muted block">{dateStrWIB}</span>
            </div>
            <div>
              <span className="text-muted block text-[11px]">Tiba</span>
              <span className="font-bold text-ink text-sm">{arrTimeWIB}</span>
              <span className="text-[10px] text-muted block">Estimasi tiba</span>
            </div>
            <div>
              <span className="text-muted block text-[11px]">Durasi & Jarak</span>
              <span className="font-bold text-ink text-sm">{durationFormatted}</span>
              <span className="text-[10px] text-muted block">{schedule.route.distanceKm} km</span>
            </div>
            <div>
              <span className="text-muted block text-[11px]">Ketersediaan</span>
              <span
                className={`font-bold text-sm ${
                  availableSeatsCount > 0 ? 'text-success' : 'text-error'
                }`}
              >
                {availableSeatsCount > 0 ? `Sisa ${availableSeatsCount} kursi` : 'Penuh'}
              </span>
              <span className="text-[10px] text-muted block">Total {schedule.bus.totalSeats} kursi</span>
            </div>
          </div>
        </div>

        {/* Peta Rute Interaktif (Leaflet Client-Only) */}
        <div className="bg-white border border-borderCol rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-ink">Peta Rute Perjalanan</h2>
              <p className="text-xs text-muted">
                Visualisasi jalur perjalanan dari titik keberangkatan ke titik tujuan
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <MapPin size={14} className="text-primary" />
              <span>2 Titik Terminal</span>
            </div>
          </div>

          {/* Leaflet Map Dynamic Component */}
          <ScheduleMapWrapper
            origin={originCoord}
            destination={destCoord}
            distanceKm={schedule.route.distanceKm}
            durationFormatted={durationFormatted}
          />

          <div className="p-3 bg-surface rounded-xl border border-borderCol text-xs text-muted space-y-1">
            <p className="flex items-center gap-1.5 text-ink font-semibold">
              <ShieldCheck size={14} className="text-primary" />
              <span>Verifikasi Titik Terminal:</span>
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] pl-1">
              <li>
                Titik Asal ({originCoord.terminalName || originCoord.cityName}):{' '}
                <strong className={originVerified ? 'text-emerald-700' : 'text-amber-700'}>
                  {originVerified ? 'Koordinat Terverifikasi' : 'Menggunakan Koordinat Kota'}
                </strong>
              </li>
              <li>
                Titik Tujuan ({destCoord.terminalName || destCoord.cityName}):{' '}
                <strong className={destVerified ? 'text-emerald-700' : 'text-amber-700'}>
                  {destVerified ? 'Koordinat Terverifikasi' : 'Menggunakan Koordinat Kota'}
                </strong>
              </li>
            </ul>
          </div>
        </div>

        {/* Fasilitas Bus */}
        {facilities.length > 0 && (
          <div className="bg-white border border-borderCol rounded-2xl p-5 sm:p-6 shadow-2xs">
            <h3 className="text-sm font-bold text-ink mb-3">Fasilitas Bus</h3>
            <div className="flex flex-wrap gap-2">
              {facilities.map((fac, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 bg-primary-tint/50 text-primary border border-primary/20 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  <CheckCircle2 size={13} />
                  <span>{fac}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CTA Lanjutkan Pemesanan */}
        <div className="pt-2">
          {availableSeatsCount > 0 ? (
            <Link
              href={proceedUrl}
              className="w-full py-3.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition shadow-sm text-center block text-sm"
            >
              Lanjutkan Pilih Kursi ({availableSeatsCount} Kursi Tersedia)
            </Link>
          ) : (
            <button
              disabled
              className="w-full py-3.5 bg-borderCol text-muted font-bold rounded-xl text-center block text-sm cursor-not-allowed"
            >
              Jadwal Penuh (Tidak Ada Kursi Tersedia)
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
