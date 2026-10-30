import fs from 'fs'
import path from 'path'
import JSZip from 'jszip'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
    },
  },
})

/**
 * Format Date object into GTFS local time HH:MM:SS in Asia/Jakarta timezone
 */
function formatGTFSTime(dateObj) {
  if (!dateObj) return '00:00:00'
  const d = new Date(dateObj)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(d)

  let hour = parts.find((p) => p.type === 'hour')?.value || '00'
  if (hour === '24') hour = '00'
  const min = parts.find((p) => p.type === 'minute')?.value || '00'
  const sec = parts.find((p) => p.type === 'second')?.value || '00'

  return `${hour.padStart(2, '0')}:${min.padStart(2, '0')}:${sec.padStart(2, '0')}`
}

/**
 * Format Date object into GTFS date string YYYYMMDD in Asia/Jakarta timezone
 */
function formatGTFSDate(dateObj) {
  const d = new Date(dateObj)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)

  const y = parts.find((p) => p.type === 'year')?.value || '2026'
  const m = parts.find((p) => p.type === 'month')?.value || '10'
  const day = parts.find((p) => p.type === 'day')?.value || '29'

  return `${y}${m.padStart(2, '0')}${day.padStart(2, '0')}`
}

function escapeCsv(value) {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

async function exportGtfs() {
  console.log('============================================================')
  console.log('🚍 MEMULAI GENERASI GTFS EXPORT (RUTEKU FEED SPECIFICATION)')
  console.log('============================================================')
  const startTime = Date.now()

  // 1. Ambil seluruh data master dari database
  console.log('Memuat data dari database Neon...')
  const operators = await prisma.operator.findMany({ orderBy: { name: 'asc' } })
  const terminals = await prisma.terminal.findMany({
    include: { city: true },
    orderBy: { name: 'asc' },
  })
  const routes = await prisma.route.findMany({
    include: { originCity: true, destinationCity: true },
  })
  const schedules = await prisma.schedule.findMany({
    where: { status: 'ACTIVE' },
    include: {
      bus: { include: { operator: true } },
      route: { include: { originCity: true, destinationCity: true } },
      scheduleStops: {
        include: { terminal: true },
        orderBy: { stopSequence: 'asc' },
      },
    },
    orderBy: { departureTime: 'asc' },
  })

  console.log(`Ditemukan:`)
  console.log(`- ${operators.length} Operator (Agency)`)
  console.log(`- ${terminals.length} Terminal (Stops)`)
  console.log(`- ${routes.length} Rute (Routes)`)
  console.log(`- ${schedules.length} Jadwal Perjalanan (Trips)`)

  const zip = new JSZip()

  // -------------------------------------------------------------------------
  // 1. agency.txt
  // -------------------------------------------------------------------------
  console.log('Menyusun agency.txt...')
  const agencyRows = [
    ['agency_id', 'agency_name', 'agency_url', 'agency_timezone', 'agency_lang', 'agency_phone'],
  ]
  for (const op of operators) {
    agencyRows.push([
      op.code,
      op.name,
      `https://ruteku.id/operator/${op.code.toLowerCase()}`,
      'Asia/Jakarta',
      'id',
      op.contactPhone || '021-1500123',
    ])
  }
  const agencyCsv = agencyRows.map((r) => r.map(escapeCsv).join(',')).join('\n')
  zip.file('agency.txt', agencyCsv)

  // -------------------------------------------------------------------------
  // 2. stops.txt
  // -------------------------------------------------------------------------
  console.log('Menyusun stops.txt...')
  const stopRows = [['stop_id', 'stop_name', 'stop_lat', 'stop_lon']]
  for (const t of terminals) {
    // Gunakan koordinat terminal jika terverifikasi, jika belum pakai koordinat kota
    let lat = t.lat
    let lng = t.lng
    if (!t.coordsVerified && t.city) {
      lat = t.city.lat || lat
      lng = t.city.lng || lng
    }
    stopRows.push([t.id, t.name, lat.toFixed(6), lng.toFixed(6)])
  }
  const stopsCsv = stopRows.map((r) => r.map(escapeCsv).join(',')).join('\n')
  zip.file('stops.txt', stopsCsv)

  // -------------------------------------------------------------------------
  // 3. routes.txt (route_type: 3 = Bus)
  // -------------------------------------------------------------------------
  console.log('Menyusun routes.txt...')
  const routeRows = [
    ['route_id', 'agency_id', 'route_short_name', 'route_long_name', 'route_type'],
  ]

  // Petakan rute unik per operator
  const routeSet = new Set()
  for (const s of schedules) {
    const routeId = `${s.routeId}_${s.bus.operator.code}`
    if (!routeSet.has(routeId)) {
      routeSet.add(routeId)
      const shortName = `${s.route.originCity.name} - ${s.route.destinationCity.name}`
      const longName = `Layanan Bus Antarkota ${s.bus.operator.name} (${shortName})`
      routeRows.push([
        routeId,
        s.bus.operator.code,
        shortName,
        longName,
        '3', // route_type 3 = Bus (Standar GTFS)
      ])
    }
  }
  const routesCsv = routeRows.map((r) => r.map(escapeCsv).join(',')).join('\n')
  zip.file('routes.txt', routesCsv)

  // -------------------------------------------------------------------------
  // 4. trips.txt
  // -------------------------------------------------------------------------
  console.log('Menyusun trips.txt...')
  const tripRows = [['route_id', 'service_id', 'trip_id', 'trip_headsign', 'direction_id']]
  const calendarDatesSet = new Set()

  for (const s of schedules) {
    const routeId = `${s.routeId}_${s.bus.operator.code}`
    const dateFormatted = formatGTFSDate(s.departureTime)
    const serviceId = `SERVICE_${dateFormatted}`
    calendarDatesSet.add(`${serviceId},${dateFormatted}`)

    tripRows.push([
      routeId,
      serviceId,
      s.id,
      s.route.destinationCity.name,
      '0',
    ])
  }
  const tripsCsv = tripRows.map((r) => r.map(escapeCsv).join(',')).join('\n')
  zip.file('trips.txt', tripsCsv)

  // -------------------------------------------------------------------------
  // 5. stop_times.txt (Waktu lokal Asia/Jakarta)
  // -------------------------------------------------------------------------
  console.log('Menyusun stop_times.txt...')
  const stopTimeRows = [
    ['trip_id', 'arrival_time', 'departure_time', 'stop_id', 'stop_sequence'],
  ]

  for (const s of schedules) {
    if (s.scheduleStops && s.scheduleStops.length > 0) {
      for (const stop of s.scheduleStops) {
        stopTimeRows.push([
          s.id,
          formatGTFSTime(stop.arrivalAt),
          formatGTFSTime(stop.departureAt),
          stop.terminalId,
          String(stop.stopSequence),
        ])
      }
    } else {
      // Fallback jika tidak ada stops eksplisit: terminal default route
      const depTime = formatGTFSTime(s.departureTime)
      const arrTime = formatGTFSTime(s.arrivalTime)
      stopTimeRows.push([s.id, depTime, depTime, terminals[0]?.id || 'STOP-1', '1'])
      stopTimeRows.push([s.id, arrTime, arrTime, terminals[1]?.id || 'STOP-2', '2'])
    }
  }
  const stopTimesCsv = stopTimeRows.map((r) => r.map(escapeCsv).join(',')).join('\n')
  zip.file('stop_times.txt', stopTimesCsv)

  // -------------------------------------------------------------------------
  // 6. calendar_dates.txt
  // -------------------------------------------------------------------------
  console.log('Menyusun calendar_dates.txt...')
  const calendarRows = [['service_id', 'date', 'exception_type']]
  for (const entry of Array.from(calendarDatesSet).sort()) {
    const [serviceId, date] = entry.split(',')
    calendarRows.push([serviceId, date, '1']) // 1 = Layanan ditambahkan pada tanggal tersebut
  }
  const calendarCsv = calendarRows.map((r) => r.map(escapeCsv).join(',')).join('\n')
  zip.file('calendar_dates.txt', calendarCsv)

  // -------------------------------------------------------------------------
  // Generate exports/gtfs.zip
  // -------------------------------------------------------------------------
  console.log('Mengompresi seluruh file GTFS ke exports/gtfs.zip...')
  const exportDir = path.resolve('exports')
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true })
  }

  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  })

  const zipPath = path.join(exportDir, 'gtfs.zip')
  fs.writeFileSync(zipPath, zipBuffer)

  const stats = fs.statSync(zipPath)
  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2)

  console.log('============================================================')
  console.log(`✓ SUKSES: exports/gtfs.zip berhasil dibuat (${(stats.size / 1024).toFixed(1)} KB)`)
  console.log(`Durasi pemrosesan: ${durationSec} detik`)
  console.log('Berkas di dalam ZIP:')
  console.log('  1. agency.txt')
  console.log('  2. stops.txt')
  console.log('  3. routes.txt')
  console.log('  4. trips.txt')
  console.log('  5. stop_times.txt')
  console.log('  6. calendar_dates.txt')
  console.log('============================================================')

  await prisma.$disconnect()
}

exportGtfs().catch((err) => {
  console.error('Fatal error saat ekspor GTFS:', err)
  process.exit(1)
})

