import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { estimateBusDurationMinutes } from '@/lib/bus-config';

// Suggestions when a route has no schedules
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

    // Resolve route between the two cities
    const route = await prisma.route.findUnique({
      where: {
        originCityId_destinationCityId: {
          originCityId: originCity.id,
          destinationCityId: destCity.id
        }
      }
    });

    if (!route) {
      return NextResponse.json({
        success: true,
        data: {
          schedules: [],
          route: null,
          message: `Saat ini belum tersedia rute langsung dari ${originCity.name} ke ${destCity.name}. Silakan pilih rute populer yang tersedia.`,
          suggestions: POPULAR_SUGGESTIONS
        }
      });
    }

    // Date filtering (WIB timezone: UTC+7)
    let dateFilter: any = {};
    if (dateParam) {
      // Parse YYYY-MM-DD
      const [year, month, day] = dateParam.split('-').map(Number);
      if (year && month && day) {
        // Start of day in WIB is UTC 17:00 of previous day
        // End of day in WIB is UTC 16:59:59 of current day
        const startOfDayUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
        const endOfDayUTC = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
        dateFilter = {
          departureTime: {
            gte: startOfDayUTC,
            lte: endOfDayUTC
          }
        };
      }
    }

    const schedules = await prisma.schedule.findMany({
      where: {
        routeId: route.id,
        status: 'ACTIVE',
        ...dateFilter
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
        originTerminal: originStop ? originStop.terminal.name : 'Terminal Asal',
        destinationTerminal: destStop ? destStop.terminal.name : 'Terminal Tujuan',
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
