import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { estimateBusDurationMinutes } from '@/lib/bus-config';


// Suggestions when needed
const POPULAR_SUGGESTIONS = [
  { from: 'Jakarta', to: 'Bandung', label: 'Jakarta → Bandung' },
  { from: 'Bandung', to: 'Jakarta', label: 'Bandung → Jakarta' },
  { from: 'Jakarta', to: 'Semarang', label: 'Jakarta → Semarang' },
  { from: 'Jakarta', to: 'Yogyakarta', label: 'Jakarta → Yogyakarta' },
  { from: 'Semarang', to: 'Surabaya', label: 'Semarang → Surabaya' },
  { from: 'Surabaya', to: 'Malang', label: 'Surabaya → Malang' },
  { from: 'Yogyakarta', to: 'Surabaya', label: 'Yogyakarta → Surabaya' }
];

async function resolveCity(input: string) {
  const q = input.trim().toLowerCase();
  if (!q) return null;

  // Check aliases & popular hub city names
  if (q === 'jakarta' || q === 'dki' || q === 'jkt') {
    return prisma.city.findFirst({
      where: { OR: [{ code: '31.71' }, { name: { contains: 'Jakarta Pusat', mode: 'insensitive' } }] }
    });
  }
  if (q === 'solo' || q === 'surakarta') {
    return prisma.city.findFirst({
      where: { OR: [{ code: '33.72' }, { name: { contains: 'Surakarta', mode: 'insensitive' } }] }
    });
  }
  if (q === 'jogja' || q === 'yogyakarta' || q === 'yogya') {
    return prisma.city.findFirst({
      where: { OR: [{ code: '34.71' }, { name: { contains: 'Yogyakarta', mode: 'insensitive' } }] }
    });
  }
  if (q === 'bandung') {
    return prisma.city.findFirst({
      where: { OR: [{ code: '32.73' }, { name: { contains: 'Kota Bandung', mode: 'insensitive' } }] }
    });
  }
  if (q === 'semarang') {
    return prisma.city.findFirst({
      where: { OR: [{ code: '33.74' }, { name: { contains: 'Kota Semarang', mode: 'insensitive' } }] }
    });
  }
  if (q === 'surabaya') {
    return prisma.city.findFirst({
      where: { OR: [{ code: '35.78' }, { name: { contains: 'Kota Surabaya', mode: 'insensitive' } }] }
    });
  }
  if (q === 'malang') {
    return prisma.city.findFirst({
      where: { OR: [{ code: '35.73' }, { name: { contains: 'Kota Malang', mode: 'insensitive' } }] }
    });
  }
  if (q === 'cirebon') {
    return prisma.city.findFirst({
      where: { OR: [{ code: '32.74' }, { name: { contains: 'Kota Cirebon', mode: 'insensitive' } }] }
    });
  }
  if (q === 'bogor') {
    return prisma.city.findFirst({
      where: { OR: [{ code: '32.71' }, { name: { contains: 'Kota Bogor', mode: 'insensitive' } }] }
    });
  }
  if (q === 'tegal') {
    return prisma.city.findFirst({
      where: { OR: [{ code: '33.76' }, { name: { contains: 'Kota Tegal', mode: 'insensitive' } }] }
    });
  }
  if (q === 'denpasar' || q === 'bali') {
    return prisma.city.findFirst({
      where: { OR: [{ code: '51.71' }, { name: { contains: 'Denpasar', mode: 'insensitive' } }] }
    });
  }

  // 1. Prioritize Hub City first if query matches
  const hubMatch = await prisma.city.findFirst({
    where: {
      isHub: true,
      OR: [
        { id: input },
        { code: input },
        { name: { contains: q, mode: 'insensitive' } }
      ]
    }
  });
  if (hubMatch) return hubMatch;

  // 2. Exact or partial name match across all 514 cities
  return prisma.city.findFirst({
    where: {
      OR: [
        { id: input },
        { code: input },
        { name: { equals: input, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } }
      ]
    }
  });
}

function calculateDistanceKm(lat1?: number | null, lon1?: number | null, lat2?: number | null, lon2?: number | null): number {
  if (lat1 && lon1 && lat2 && lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const straightKm = R * c;
    return Math.max(50, Math.round(straightKm * 1.3)); // 1.3 road curvature factor
  }
  return 180; // default realistic intercity distance
}

function calculateTicketPrice(distanceKm: number, isSleeper: boolean = false): number {
  const basePrice = Math.max(50000, Math.round((distanceKm * 700) / 1000) * 1000);
  if (isSleeper) {
    return Math.round((basePrice * 1.5) / 1000) * 1000;
  }
  return basePrice;
}

function generateSeatNumbers(busClass: string, totalSeats: number): string[] {
  const seats: string[] = [];
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

async function ensureTerminal(city: any) {
  let terminal = await prisma.terminal.findFirst({ where: { cityId: city.id } });
  if (!terminal) {
    const cleanName = city.name.replace(/^(Kota|Kab\.)\s+/i, '').trim();
    terminal = await prisma.terminal.create({
      data: {
        cityId: city.id,
        name: `Terminal ${cleanName}`,
        lat: city.lat || -6.2,
        lng: city.lng || 106.8,
        coordsVerified: false
      }
    });
  }
  return terminal;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const originParam = searchParams.get('origin') || searchParams.get('from') || '';
    const destParam = searchParams.get('destination') || searchParams.get('to') || '';
    const dateParam = searchParams.get('date') || '';

    if (!originParam || !destParam) {
      return NextResponse.json(
        { success: false, error: 'Kota asal dan tujuan wajib diisi.' },
        { status: 400 }
      );
    }

    const originCity = await resolveCity(originParam);
    const destCity = await resolveCity(destParam);

    if (!originCity || !destCity) {
      return NextResponse.json(
        {
          success: false,
          error: `Kota tidak ditemukan dalam sistem wilayah: ${!originCity ? originParam : destParam}`
        },
        { status: 404 }
      );
    }

    // Origin and destination cannot be identical
    if (originCity.id === destCity.id) {
      return NextResponse.json(
        { success: false, error: 'Kota asal dan tujuan tidak boleh sama.' },
        { status: 400 }
      );
    }

    // Resolve or automatically create route between the two cities
    let route = await prisma.route.findUnique({
      where: {
        originCityId_destinationCityId: {
          originCityId: originCity.id,
          destinationCityId: destCity.id
        }
      }
    });

    if (!route) {
      const distanceKm = calculateDistanceKm(originCity.lat, originCity.lng, destCity.lat, destCity.lng);
      const osrmDurationMinutes = Math.round((distanceKm / 50) * 60);

      route = await prisma.route.upsert({
        where: {
          originCityId_destinationCityId: {
            originCityId: originCity.id,
            destinationCityId: destCity.id
          }
        },
        update: {},
        create: {
          originCityId: originCity.id,
          destinationCityId: destCity.id,
          distanceKm,
          osrmDurationMinutes,
          provider: 'dummy'
        }
      });
    }

    // Date filtering (WIB timezone: UTC+7)
    let searchDate = dateParam;
    if (!searchDate) {
      const nowWIB = new Date(Date.now() + 7 * 3600000);
      searchDate = nowWIB.toISOString().split('T')[0];
    }

    const [year, month, day] = searchDate.split('-').map(Number);
    const startOfDayUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    const endOfDayUTC = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    let schedules = await prisma.schedule.findMany({
      where: {
        routeId: route.id,
        status: 'ACTIVE',
        departureTime: {
          gte: startOfDayUTC,
          lte: endOfDayUTC
        }
      },
      include: {
        bus: {
          include: {
            operator: true
          }
        },
        scheduleStops: {
          include: {
            terminal: true
          },
          orderBy: { stopSequence: 'asc' }
        },
        seats: true
      },
      orderBy: { departureTime: 'asc' }
    });

    // If no schedules exist for this route on the requested date, dynamically generate realistic dummy schedules in DB
    if (schedules.length === 0) {
      const originTerminal = await ensureTerminal(originCity);
      const destTerminal = await ensureTerminal(destCity);

      const allBuses = await prisma.bus.findMany({
        include: { operator: true },
        orderBy: { createdAt: 'asc' }
      });

      if (allBuses.length > 0) {
        // Schedule 6 departures per day
        const slotConfigs = [
          { hourUTC: 0, minuteUTC: 0, busIndex: 0 },   // 07:00 WIB - Sinar Rute Exec
          { hourUTC: 2, minuteUTC: 30, busIndex: 2 },  // 09:30 WIB - Nusantara Kilat Exec
          { hourUTC: 6, minuteUTC: 15, busIndex: 1 },  // 13:15 WIB - Sinar Rute Exec
          { hourUTC: 9, minuteUTC: 30, busIndex: 3 },  // 16:30 WIB - Nusantara Kilat Exec
          { hourUTC: 12, minuteUTC: 45, busIndex: 4 }, // 19:45 WIB - Sinar Rute Sleeper
          { hourUTC: 14, minuteUTC: 15, busIndex: 5 }, // 21:15 WIB - Nusantara Kilat Sleeper
        ];

        const durationMinutes = Math.ceil((route.osrmDurationMinutes || 180) * 1.3);

        for (const slot of slotConfigs) {
          const bus = allBuses[slot.busIndex] || allBuses[0];
          const depTime = new Date(Date.UTC(year, month - 1, day, slot.hourUTC, slot.minuteUTC, 0));
          const arrTime = new Date(depTime.getTime() + durationMinutes * 60000);
          const isSleeper = bus.busClass === 'SLEEPER_2_1';
          const price = calculateTicketPrice(route.distanceKm, isSleeper);

          try {
            const schedule = await prisma.schedule.upsert({
              where: {
                busId_departureTime: {
                  busId: bus.id,
                  departureTime: depTime
                }
              },
              update: {
                routeId: route.id,
                arrivalTime: arrTime,
                price,
                status: 'ACTIVE'
              },
              create: {
                busId: bus.id,
                routeId: route.id,
                departureTime: depTime,
                arrivalTime: arrTime,
                price,
                status: 'ACTIVE'
              }
            });

            // Ensure stops
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

            // Ensure seats
            const existingSeatsCount = await prisma.scheduleSeat.count({
              where: { scheduleId: schedule.id }
            });

            if (existingSeatsCount === 0) {
              const seatNums = generateSeatNumbers(bus.busClass, bus.totalSeats);
              const seatsData = seatNums.map((seatNumber) => ({
                scheduleId: schedule.id,
                seatNumber,
                status: 'AVAILABLE' as const
              }));

              await prisma.scheduleSeat.createMany({
                data: seatsData,
                skipDuplicates: true
              });
            }
          } catch (slotErr) {
            console.warn('Slot generation skipped:', slotErr);
          }
        }

        // Re-query newly created schedules
        schedules = await prisma.schedule.findMany({
          where: {
            routeId: route.id,
            status: 'ACTIVE',
            departureTime: {
              gte: startOfDayUTC,
              lte: endOfDayUTC
            }
          },
          include: {
            bus: {
              include: {
                operator: true
              }
            },
            scheduleStops: {
              include: {
                terminal: true
              },
              orderBy: { stopSequence: 'asc' }
            },
            seats: true
          },
          orderBy: { departureTime: 'asc' }
        });
      }
    }

    const estimatedMinutes = estimateBusDurationMinutes(route.osrmDurationMinutes);
    const durationHours = Math.floor(estimatedMinutes / 60);
    const durationRemainingMins = estimatedMinutes % 60;
    const durationFormatted = `${durationHours}j ${durationRemainingMins > 0 ? durationRemainingMins + 'm' : ''}`.trim();

    const formattedSchedules = schedules.map(s => {
      const availableSeatsCount = s.seats.filter(st => st.status === 'AVAILABLE').length;
      const originStop = s.scheduleStops.find(st => st.stopSequence === 1);
      const destStop = s.scheduleStops.find(st => st.stopSequence === 2);

      // Format time in WIB (UTC+7)
      const depDate = new Date(s.departureTime);
      const arrDate = new Date(s.arrivalTime);
      
      const depTimeWIB = depDate.toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const arrTimeWIB = arrDate.toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      return {
        id: s.id,
        departureTime: s.departureTime,
        arrivalTime: s.arrivalTime,
        dep: depTimeWIB,
        arr: arrTimeWIB,
        price: s.price,
        formattedPrice: `Rp ${s.price.toLocaleString('id-ID')}`,
        availableSeats: availableSeatsCount,
        totalSeats: s.bus.totalSeats,
        isFull: availableSeatsCount === 0,
        bus: {
          id: s.bus.id,
          name: s.bus.name,
          busClass: s.bus.busClass,
          displayClass: s.bus.busClass === 'EXECUTIVE_2_2' ? 'Executive 2–2' : 'Sleeper 2–1',
          facilities: s.bus.facilities,
          operatorName: s.bus.operator.name,
          operatorCode: s.bus.operator.code
        },
        originTerminal: originStop ? originStop.terminal.name : `Terminal ${originCity.name.replace(/^(Kota|Kab\.)\s+/i, '')}`,
        destinationTerminal: destStop ? destStop.terminal.name : `Terminal ${destCity.name.replace(/^(Kota|Kab\.)\s+/i, '')}`,
        distanceKm: route.distanceKm,
        osrmDurationMinutes: route.osrmDurationMinutes,
        estimatedDurationMinutes: estimatedMinutes,
        durationFormatted: `${durationFormatted} (estimasi)`
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        originCity: {
          id: originCity.id,
          name: originCity.name,
          code: originCity.code
        },
        destinationCity: {
          id: destCity.id,
          name: destCity.name,
          code: destCity.code
        },
        route: {
          distanceKm: route.distanceKm,
          osrmDurationMinutes: route.osrmDurationMinutes,
          estimatedDurationMinutes: estimatedMinutes,
          durationFormatted: `${durationFormatted} (estimasi)`
        },
        totalSchedules: formattedSchedules.length,
        schedules: formattedSchedules,
        suggestions: formattedSchedules.length === 0 ? POPULAR_SUGGESTIONS : []
      }
    });
  } catch (error: any) {
    console.error('Error fetching schedules:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat memuat jadwal' },
      { status: 500 }
    );
  }
}
