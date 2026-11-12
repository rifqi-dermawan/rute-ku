import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function calculateTicketPrice(distanceKm, isSleeper = false) {
  const basePrice = Math.max(50000, Math.round((distanceKm * 700) / 1000) * 1000);
  if (isSleeper) {
    return Math.round((basePrice * 1.5) / 1000) * 1000;
  }
  return basePrice;
}

function generateSeatNumbers(busClass, totalSeats) {
  const seats = [];
  if (busClass === 'SLEEPER_2_1') {
    const cols = ['A', 'B', 'C'];
    const rows = Math.ceil(totalSeats / cols.length);
    for (let r = 1; r <= rows; r++) {
      for (const c of cols) {
        if (seats.length < totalSeats) {
          seats.push(`${r}${c}`);
        }
      }
    }
  } else {
    const cols = ['A', 'B', 'C', 'D'];
    const rows = Math.ceil(totalSeats / cols.length);
    for (let r = 1; r <= rows; r++) {
      for (const c of cols) {
        if (seats.length < totalSeats) {
          seats.push(`${r}${c}`);
        }
      }
    }
  }
  return seats;
}

async function main() {
  console.log('Seeding upcoming schedules for popular routes...');

  const allBuses = await prisma.bus.findMany({
    include: { operator: true },
    orderBy: { createdAt: 'asc' }
  });

  const allRoutes = await prisma.route.findMany({
    include: {
      originCity: true,
      destinationCity: true
    }
  });

  console.log(`Found ${allBuses.length} buses and ${allRoutes.length} routes.`);

  // 14 days starting from today (2026-11-12)
  const today = new Date(Date.UTC(2026, 10, 12));
  const days = 14;

  const terminals = await prisma.terminal.findMany();

  // Pick top 10 key routes (both directions = 20 routes)
  const popularPairs = [
    ['Jakarta', 'Bandung'],
    ['Bandung', 'Jakarta'],
    ['Jakarta', 'Yogyakarta'],
    ['Yogyakarta', 'Jakarta'],
    ['Jakarta', 'Semarang'],
    ['Semarang', 'Jakarta'],
    ['Semarang', 'Surabaya'],
    ['Surabaya', 'Semarang'],
    ['Surabaya', 'Malang'],
    ['Malang', 'Surabaya'],
    ['Yogyakarta', 'Surabaya'],
    ['Surabaya', 'Yogyakarta']
  ];

  const targetRoutes = [];
  for (const [from, to] of popularPairs) {
    const r = allRoutes.find(
      x =>
        x.originCity.name.toLowerCase().includes(from.toLowerCase()) &&
        x.destinationCity.name.toLowerCase().includes(to.toLowerCase())
    );
    if (r) targetRoutes.push(r);
  }

  console.log(`Targeting ${targetRoutes.length} popular routes for pre-seeding.`);

  let createdCount = 0;

  for (let d = 0; d < days; d++) {
    const curDate = new Date(today.getTime() + d * 86400000);
    const year = curDate.getUTCFullYear();
    const month = curDate.getUTCMonth();
    const day = curDate.getUTCDate();

    for (let rIdx = 0; rIdx < targetRoutes.length; rIdx++) {
      const route = targetRoutes[rIdx];
      const originTerminal = terminals.find(t => t.cityId === route.originCityId);
      const destTerminal = terminals.find(t => t.cityId === route.destinationCityId);

      // 4 departures per route per day
      const departures = [
        { hourUTC: 0, minuteUTC: (rIdx * 7) % 30, bus: allBuses[0] }, // ~07:00 WIB
        { hourUTC: 6, minuteUTC: (rIdx * 5) % 30, bus: allBuses[1] }, // ~13:00 WIB
        { hourUTC: 9, minuteUTC: (rIdx * 4) % 30, bus: allBuses[2] }, // ~16:00 WIB
        { hourUTC: 12, minuteUTC: (rIdx * 6) % 30, bus: allBuses[4] || allBuses[3] }, // ~19:00 WIB
      ];

      const durationMinutes = Math.ceil((route.osrmDurationMinutes || 180) * 1.3);

      for (const dep of departures) {
        const depTime = new Date(Date.UTC(year, month, day, dep.hourUTC, dep.minuteUTC, 0));
        const arrTime = new Date(depTime.getTime() + durationMinutes * 60000);
        const isSleeper = dep.bus.busClass === 'SLEEPER_2_1';
        const price = calculateTicketPrice(route.distanceKm, isSleeper);

        try {
          const schedule = await prisma.schedule.upsert({
            where: {
              busId_departureTime: {
                busId: dep.bus.id,
                departureTime: depTime
              }
            },
            update: {},
            create: {
              busId: dep.bus.id,
              routeId: route.id,
              departureTime: depTime,
              arrivalTime: arrTime,
              price,
              status: 'ACTIVE'
            }
          });

          if (originTerminal) {
            await prisma.scheduleStop.upsert({
              where: {
                scheduleId_stopSequence: {
                  scheduleId: schedule.id,
                  stopSequence: 1
                }
              },
              update: {},
              create: {
                scheduleId: schedule.id,
                terminalId: originTerminal.id,
                stopSequence: 1,
                arrivalAt: depTime,
                departureAt: depTime
              }
            });
          }

          if (destTerminal) {
            await prisma.scheduleStop.upsert({
              where: {
                scheduleId_stopSequence: {
                  scheduleId: schedule.id,
                  stopSequence: 2
                }
              },
              update: {},
              create: {
                scheduleId: schedule.id,
                terminalId: destTerminal.id,
                stopSequence: 2,
                arrivalAt: arrTime,
                departureAt: arrTime
              }
            });
          }

          const seatCount = await prisma.scheduleSeat.count({ where: { scheduleId: schedule.id } });
          if (seatCount === 0) {
            const seatNums = generateSeatNumbers(dep.bus.busClass, dep.bus.totalSeats);
            await prisma.scheduleSeat.createMany({
              data: seatNums.map(s => ({
                scheduleId: schedule.id,
                seatNumber: s,
                status: 'AVAILABLE'
              })),
              skipDuplicates: true
            });
            createdCount++;
          }
        } catch {}
      }
    }
  }

  console.log(`✅ Pre-seeding completed. Created ${createdCount} new schedules with seats.`);
}

main().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
