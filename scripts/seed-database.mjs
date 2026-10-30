import fs from 'fs';
import path from 'path';
import { PrismaClient } from 'file:///D:/rplproject/ruteku-app/node_modules/@prisma/client/default.js';

// ============================================================
// SAFETY GUARD: Validasi Hostname Sebelum Menulis ke Database
// ============================================================
const dbUrlForGuard = process.env.DATABASE_URL;
if (!dbUrlForGuard) {
  console.error('❌ [SEED GUARD] DATABASE_URL tidak disetel!');
  process.exit(1);
}

let seedTargetHostname = '';
try {
  seedTargetHostname = new URL(dbUrlForGuard).hostname;
} catch {
  console.error('❌ [SEED GUARD] Format DATABASE_URL tidak valid!');
  process.exit(1);
}

console.log(`[SEED SAFETY GUARD] Target Database Hostname: ${seedTargetHostname}`);

if (seedTargetHostname.includes('ep-raspy-boat-az11ci0v') && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
  console.error(`❌ [SEED BLOCKED] DATABASE_URL mengarah ke database PRODUCTION (${seedTargetHostname})! Untuk mengizinkan, setel ALLOW_PRODUCTION_SEED="true".`);
  process.exit(1);
}

const allowedSeedHost = process.env.SEED_TARGET_HOST;
if (!allowedSeedHost || allowedSeedHost !== seedTargetHostname) {
  console.error(`❌ [SEED BLOCKED] SEED_TARGET_HOST (${allowedSeedHost || 'TIDAK DISETEL'}) tidak cocok dengan hostname DATABASE_URL (${seedTargetHostname}).`);
  console.error(`   Untuk menjalankan seed, setel variabel SEED_TARGET_HOST="${seedTargetHostname}".`);
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
    }
  }
});

async function retryQuery(fn, maxRetries = 5) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt >= maxRetries) throw err;
      console.warn(`[RETRY] Terjadi kendala koneksi (${err.code || err.message}). Menghubungkan ulang (${attempt}/${maxRetries})...`);
      try {
        await prisma.$disconnect();
        await prisma.$connect();
      } catch {}
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

const BUS_DURATION_FACTOR = 1.3;
const TICKET_PRICE_PER_KM = 700;
const MIN_TICKET_PRICE = 50000;

function estimateBusDurationMinutes(osrmMinutes) {
  return Math.ceil(osrmMinutes * BUS_DURATION_FACTOR);
}

function calculateTicketPrice(distanceKm) {
  const rawPrice = distanceKm * TICKET_PRICE_PER_KM;
  const rounded = Math.round(rawPrice / 1000) * 1000;
  return Math.max(MIN_TICKET_PRICE, rounded);
}

function toTitleCase(str) {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (word === 'dki' || word === 'di') return word.toUpperCase();
      if (word.startsWith('kab.')) return 'Kab. ' + word.slice(4).charAt(0).toUpperCase() + word.slice(5);
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function seedCities() {
  console.log('\n--- SEED CITIES (TAHAP 2) ---');
  const regenciesPath = path.resolve('data/wilayah/kabupaten_kota.json');
  const hubsPath = path.resolve('data/hub-cities.json');

  const regencies = JSON.parse(fs.readFileSync(regenciesPath, 'utf-8'));
  const hubs = JSON.parse(fs.readFileSync(hubsPath, 'utf-8'));

  // Hub matching map
  const hubMap = new Map();
  for (const h of hubs) {
    hubMap.set(h.name.toLowerCase(), h);
  }

  const citiesToUpsert = [];
  for (const r of regencies) {
    let name = toTitleCase(r.name);
    let isHub = false;
    let lat = null;
    let lng = null;

    // Check Jakarta special case (Kota Adm. Jakarta Pusat -> Kota Jakarta Pusat)
    if (r.code === '31.71' || r.name.includes('JAKARTA PUSAT')) {
      name = 'Kota Jakarta Pusat';
      const jktHub = hubMap.get('jakarta');
      isHub = true;
      lat = jktHub ? jktHub.lat : -6.1805;
      lng = jktHub ? jktHub.lng : 106.8284;
    } else {
      for (const h of hubs) {
        if (h.name.toLowerCase() === 'jakarta') continue;
        if (name.toLowerCase() === h.match.toLowerCase()) {
          isHub = true;
          lat = h.lat;
          lng = h.lng;
          break;
        }
      }
    }

    citiesToUpsert.push({
      code: r.code,
      name,
      provinceCode: r.provinceCode,
      provinceName: toTitleCase(r.provinceName),
      lat,
      lng,
      isHub
    });
  }

  console.log(`Upserting ${citiesToUpsert.length} cities...`);
  // Batch upsert using transactions or sequential batches
  const batchSize = 50;
  for (let i = 0; i < citiesToUpsert.length; i += batchSize) {
    const chunk = citiesToUpsert.slice(i, i + batchSize);
    await Promise.all(
      chunk.map(c =>
        prisma.city.upsert({
          where: { code: c.code },
          update: {
            name: c.name,
            provinceCode: c.provinceCode,
            provinceName: c.provinceName,
            lat: c.lat,
            lng: c.lng,
            isHub: c.isHub
          },
          create: c
        })
      )
    );
  }

  const totalCities = await prisma.city.count();
  const hubCities = await prisma.city.findMany({ where: { isHub: true }, orderBy: { name: 'asc' } });
  console.log(`Total cities in database: ${totalCities}`);
  console.log(`Hub cities count: ${hubCities.length}`);
  console.table(hubCities.map(h => ({ code: h.code, name: h.name, lat: h.lat, lng: h.lng, isHub: h.isHub })));

  return { totalCities, hubCities };
}

async function seedTerminals() {
  console.log('\n--- SEED TERMINALS (TAHAP 3A) ---');
  const terminalsPath = path.resolve('data/terminals.json');
  const hubsPath = path.resolve('data/hub-cities.json');

  const terminalsData = JSON.parse(fs.readFileSync(terminalsPath, 'utf-8'));
  const hubs = JSON.parse(fs.readFileSync(hubsPath, 'utf-8'));

  const hubCities = await prisma.city.findMany({ where: { isHub: true } });

  const seededTerminals = [];
  for (const t of terminalsData) {
    const hubDef = hubs.find(h => h.name.toLowerCase() === t.city.toLowerCase());
    if (!hubDef) {
      console.warn(`Hub definition not found for terminal city: ${t.city}`);
      continue;
    }

    const cityRecord = hubCities.find(c => {
      if (t.city.toLowerCase() === 'jakarta') return c.code === '31.71' || c.name.includes('Jakarta Pusat');
      return c.name.toLowerCase() === hubDef.match.toLowerCase();
    });

    if (!cityRecord) {
      console.warn(`City record not found in database for terminal city: ${t.city}`);
      continue;
    }

    const terminal = await prisma.terminal.upsert({
      where: {
        cityId_name: {
          cityId: cityRecord.id,
          name: t.name
        }
      },
      update: {
        lat: cityRecord.lat,
        lng: cityRecord.lng,
        coordsVerified: false
      },
      create: {
        cityId: cityRecord.id,
        name: t.name,
        lat: cityRecord.lat,
        lng: cityRecord.lng,
        coordsVerified: false
      }
    });
    seededTerminals.push({ ...terminal, cityName: cityRecord.name });
  }

  console.log(`Seeded ${seededTerminals.length} terminals.`);
  console.table(seededTerminals.map(t => ({
    name: t.name,
    city: t.cityName,
    lat: t.lat,
    lng: t.lng,
    coordsVerified: t.coordsVerified
  })));

  return seededTerminals;
}

async function seedRoutes() {
  console.log('\n--- SEED ROUTES (TAHAP 4) ---');
  const routesSnapshotPath = path.resolve('data/routes.json');
  if (!fs.existsSync(routesSnapshotPath)) {
    throw new Error('data/routes.json does not exist! Please run compute-routes.mjs first.');
  }

  const routesData = JSON.parse(fs.readFileSync(routesSnapshotPath, 'utf-8'));
  const hubCities = await prisma.city.findMany({ where: { isHub: true } });

  function findCityByHub(hubName, match) {
    if (hubName.toLowerCase() === 'jakarta') {
      return hubCities.find(c => c.code === '31.71' || c.name.includes('Jakarta Pusat'));
    }
    return hubCities.find(c => c.name.toLowerCase() === match.toLowerCase());
  }

  let seededCount = 0;
  for (const r of routesData) {
    const originCity = findCityByHub(r.originHub, r.originMatch);
    const destCity = findCityByHub(r.destinationHub, r.destinationMatch);

    if (!originCity || !destCity) {
      console.warn(`Could not resolve cities for route: ${r.originHub} -> ${r.destinationHub}`);
      continue;
    }

    await prisma.route.upsert({
      where: {
        originCityId_destinationCityId: {
          originCityId: originCity.id,
          destinationCityId: destCity.id
        }
      },
      update: {
        distanceKm: r.distanceKm,
        osrmDurationMinutes: r.osrmDurationMinutes,
        provider: r.provider || 'osrm',
        computedAt: r.computedAt ? new Date(r.computedAt) : new Date()
      },
      create: {
        originCityId: originCity.id,
        destinationCityId: destCity.id,
        distanceKm: r.distanceKm,
        osrmDurationMinutes: r.osrmDurationMinutes,
        provider: r.provider || 'osrm',
        computedAt: r.computedAt ? new Date(r.computedAt) : new Date()
      }
    });
    seededCount++;
  }

  const totalRoutes = await prisma.route.count();
  console.log(`Total routes in database: ${totalRoutes} (Seeded from snapshot: ${seededCount})`);
  return totalRoutes;
}

async function seedOperatorsAndBuses() {
  console.log('\n--- SEED OPERATORS & BUSES (TAHAP 3B) ---');
  const operatorsData = [
    {
      code: 'SRT',
      name: 'PO Sinar Rute',
      contactPhone: '081234567801',
      contactEmail: 'operasional@sinarrute.id'
    },
    {
      code: 'NSK',
      name: 'PO Nusantara Kilat',
      contactPhone: '081234567802',
      contactEmail: 'operasional@nusantarakilat.id'
    }
  ];

  const seededOperators = [];
  for (const op of operatorsData) {
    const record = await prisma.operator.upsert({
      where: { code: op.code },
      update: {
        name: op.name,
        contactPhone: op.contactPhone,
        contactEmail: op.contactEmail
      },
      create: op
    });
    seededOperators.push(record);
  }

  const busesData = [
    {
      operatorId: seededOperators[0].id,
      name: 'Sinar Rute Executive 01',
      busClass: 'EXECUTIVE_2_2',
      totalSeats: 32,
      facilities: ['AC', 'Reclining Seat', 'USB Charger', 'Toilet', 'Air Mineral']
    },
    {
      operatorId: seededOperators[0].id,
      name: 'Sinar Rute Executive 02',
      busClass: 'EXECUTIVE_2_2',
      totalSeats: 32,
      facilities: ['AC', 'Reclining Seat', 'USB Charger', 'Toilet', 'Air Mineral']
    },
    {
      operatorId: seededOperators[1].id,
      name: 'Nusantara Kilat Executive 01',
      busClass: 'EXECUTIVE_2_2',
      totalSeats: 32,
      facilities: ['AC', 'Reclining Seat', 'USB Charger', 'Toilet', 'Air Mineral']
    },
    {
      operatorId: seededOperators[1].id,
      name: 'Nusantara Kilat Executive 02',
      busClass: 'EXECUTIVE_2_2',
      totalSeats: 32,
      facilities: ['AC', 'Reclining Seat', 'USB Charger', 'Toilet', 'Air Mineral']
    }
  ];

  const seededBuses = [];
  for (const b of busesData) {
    const bus = await prisma.bus.upsert({
      where: {
        operatorId_name: {
          operatorId: b.operatorId,
          name: b.name
        }
      },
      update: {
        busClass: b.busClass,
        totalSeats: b.totalSeats,
        facilities: b.facilities
      },
      create: b
    });
    seededBuses.push(bus);
  }

  console.log(`Seeded ${seededOperators.length} operators and ${seededBuses.length} buses.`);
  return { operators: seededOperators, buses: seededBuses };
}

async function seedSchedulesAndSeats(buses) {
  console.log('\n--- SEED SCHEDULES, STOPS & SEATS (TAHAP 3B) ---');

  // 10 pairs (20 directional popular routes)
  const popularRoutePairs = [
    ['Jakarta', 'Bandung'],
    ['Bandung', 'Jakarta'],
    ['Jakarta', 'Bogor'],
    ['Bogor', 'Jakarta'],
    ['Jakarta', 'Cirebon'],
    ['Cirebon', 'Jakarta'],
    ['Jakarta', 'Semarang'],
    ['Semarang', 'Jakarta'],
    ['Jakarta', 'Yogyakarta'],
    ['Yogyakarta', 'Jakarta'],
    ['Bandung', 'Yogyakarta'],
    ['Yogyakarta', 'Bandung'],
    ['Semarang', 'Surabaya'],
    ['Surabaya', 'Semarang'],
    ['Yogyakarta', 'Surabaya'],
    ['Surabaya', 'Yogyakarta'],
    ['Surakarta', 'Surabaya'],
    ['Surabaya', 'Surakarta'],
    ['Malang', 'Surabaya'],
    ['Surabaya', 'Malang']
  ];

  const hubsPath = path.resolve('data/hub-cities.json');
  const hubs = JSON.parse(fs.readFileSync(hubsPath, 'utf-8'));
  const hubCities = await prisma.city.findMany({ where: { isHub: true } });
  const allTerminals = await prisma.terminal.findMany();

  function getCityByHubName(name) {
    if (name.toLowerCase() === 'jakarta') {
      return hubCities.find(c => c.code === '31.71' || c.name.includes('Jakarta Pusat'));
    }
    const h = hubs.find(x => x.name.toLowerCase() === name.toLowerCase());
    return hubCities.find(c => c.name.toLowerCase() === (h ? h.match.toLowerCase() : ''));
  }

  const resolvedRoutes = [];
  for (const [fromName, toName] of popularRoutePairs) {
    const c1 = getCityByHubName(fromName);
    const c2 = getCityByHubName(toName);
    if (!c1 || !c2) {
      console.warn(`Missing city for pair: ${fromName} -> ${toName}`);
      continue;
    }
    const routeRecord = await prisma.route.findUnique({
      where: {
        originCityId_destinationCityId: {
          originCityId: c1.id,
          destinationCityId: c2.id
        }
      }
    });
    if (!routeRecord) {
      console.warn(`Route record not found in database for ${fromName} -> ${toName}`);
      continue;
    }
    const t1 = allTerminals.find(t => t.cityId === c1.id);
    const t2 = allTerminals.find(t => t.cityId === c2.id);

    resolvedRoutes.push({
      fromName,
      toName,
      route: routeRecord,
      originTerminal: t1,
      destinationTerminal: t2
    });
  }

  console.log(`Resolved ${resolvedRoutes.length} popular routes for schedule generation.`);

  // Seat labels for 32 seats: 1A..8D
  const seatNumbers = [];
  const seatCols = ['A', 'B', 'C', 'D'];
  for (let r = 1; r <= 8; r++) {
    for (const c of seatCols) {
      seatNumbers.push(`${r}${c}`);
    }
  }

  // 14 days ahead starting from today (2026-10-29)
  const daysAhead = 14;
  const startDay = new Date(Date.UTC(2026, 9, 29)); // 2026-10-29 UTC

  // Preload existing schedules to avoid redundant network roundtrips
  const existingSchedules = await prisma.schedule.findMany({
    select: { id: true, busId: true, departureTime: true }
  });
  const existingMap = new Map();
  for (const s of existingSchedules) {
    existingMap.set(`${s.busId}_${new Date(s.departureTime).toISOString()}`, s.id);
  }
  console.log(`Preloaded ${existingSchedules.length} existing schedules in database.`);

  let totalSchedulesCreated = 0;
  let totalSeatsCreated = 0;
  let totalStopsCreated = 0;

  console.log(`Generating schedules for 14 days (3 departures/day)...`);

  for (let day = 0; day < daysAhead; day++) {
    const currentDay = new Date(startDay.getTime() + day * 86400000);
    const y = currentDay.getUTCFullYear();
    const m = currentDay.getUTCMonth();
    const d = currentDay.getUTCDate();

    for (let rIdx = 0; rIdx < resolvedRoutes.length; rIdx++) {
      const item = resolvedRoutes[rIdx];
      const bus = buses[rIdx % buses.length];
      const minuteOffset = (rIdx % 5) * 5; // 0, 5, 10, 15, 20

      // 3 departures per day (07:00, 13:00, 20:00 WIB -> 00:00, 06:00, 13:00 UTC)
      const departureTimes = [
        new Date(Date.UTC(y, m, d, 0, minuteOffset, 0)),
        new Date(Date.UTC(y, m, d, 6, minuteOffset, 0)),
        new Date(Date.UTC(y, m, d, 13, minuteOffset, 0))
      ];

      const durationMinutes = estimateBusDurationMinutes(item.route.osrmDurationMinutes);
      const price = calculateTicketPrice(item.route.distanceKm);

      for (const depTime of departureTimes) {
        const key = `${bus.id}_${depTime.toISOString()}`;
        const arrTime = new Date(depTime.getTime() + durationMinutes * 60000);

        let scheduleId = existingMap.get(key);
        if (!scheduleId) {
          const schedule = await retryQuery(() =>
            prisma.schedule.create({
              data: {
                busId: bus.id,
                routeId: item.route.id,
                departureTime: depTime,
                arrivalTime: arrTime,
                price,
                status: 'ACTIVE',
              },
            })
          );
          scheduleId = schedule.id;
          existingMap.set(key, scheduleId);
          totalSchedulesCreated++;

          if (item.originTerminal) {
            await retryQuery(() =>
              prisma.scheduleStop.create({
                data: {
                  scheduleId,
                  terminalId: item.originTerminal.id,
                  stopSequence: 1,
                  arrivalAt: depTime,
                  departureAt: depTime,
                },
              })
            );
            totalStopsCreated++;
          }

          if (item.destinationTerminal) {
            await retryQuery(() =>
              prisma.scheduleStop.create({
                data: {
                  scheduleId,
                  terminalId: item.destinationTerminal.id,
                  stopSequence: 2,
                  arrivalAt: arrTime,
                  departureAt: arrTime,
                },
              })
            );
            totalStopsCreated++;
          }
        }

        // Ensure 32 seats exist for this schedule
        const currentSeatCount = await retryQuery(() =>
          prisma.scheduleSeat.count({ where: { scheduleId } })
        );
        if (currentSeatCount < 32) {
          const existingSeats = await retryQuery(() =>
            prisma.scheduleSeat.findMany({
              where: { scheduleId },
              select: { seatNumber: true },
            })
          );
          const existingSeatNumbers = new Set(existingSeats.map((s) => s.seatNumber));
          const missingSeats = seatNumbers
            .filter((s) => !existingSeatNumbers.has(s))
            .map((s) => ({
              scheduleId,
              seatNumber: s,
              status: 'AVAILABLE',
            }));
          if (missingSeats.length > 0) {
            await retryQuery(() =>
              prisma.scheduleSeat.createMany({
                data: missingSeats,
                skipDuplicates: true,
              })
            );
            totalSeatsCreated += missingSeats.length;
          }
        }
      }
    }
  }

  const finalScheduleCount = await prisma.schedule.count();
  const finalSeatCount = await prisma.scheduleSeat.count();
  const finalStopCount = await prisma.scheduleStop.count();

  console.log(`Final Schedules Count: ${finalScheduleCount}`);
  console.log(`Final Schedule Seats Count: ${finalSeatCount}`);
  console.log(`Final Schedule Stops Count: ${finalStopCount}`);

  return {
    schedules: finalScheduleCount,
    seats: finalSeatCount,
    stops: finalStopCount
  };
}

async function main() {
  console.log('=== RUTKU DATABASE SEED MASTER ===');
  const t0 = Date.now();

  await seedCities();
  await seedTerminals();
  await seedRoutes();
  const { buses } = await seedOperatorsAndBuses();
  await seedSchedulesAndSeats(buses);

  const t1 = Date.now();
  console.log(`\n=== SEED COMPLETED IN ${((t1 - t0) / 1000).toFixed(2)}s ===`);
}

main()
  .catch(err => {
    console.error('Fatal seed database:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
