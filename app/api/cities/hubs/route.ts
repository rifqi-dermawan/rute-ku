import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const hubCities = await prisma.city.findMany({
      where: { isHub: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        provinceName: true,
        lat: true,
        lng: true
      }
    });

    const hubs = hubCities.map(c => {
      let displayName = c.name.replace(/^Kota\s+/i, '');
      const aliases: string[] = [c.name.toLowerCase(), displayName.toLowerCase()];

      if (c.code === '31.71' || c.name.includes('Jakarta Pusat')) {
        displayName = 'Jakarta';
        aliases.push('jakarta', 'dki', 'dki jakarta', 'jkt');
      } else if (c.name.includes('Surakarta')) {
        displayName = 'Surakarta (Solo)';
        aliases.push('solo', 'surakarta', 'ska');
      } else if (c.name.includes('Yogyakarta')) {
        displayName = 'Yogyakarta (Jogja)';
        aliases.push('jogja', 'yogya', 'yogyakarta', 'diy');
      }

      return {
        id: c.id,
        code: c.code,
        name: c.name,
        displayName,
        aliases,
        provinceName: c.provinceName,
        lat: c.lat,
        lng: c.lng
      };
    });

    return NextResponse.json({
      success: true,
      data: hubs
    });
  } catch (error: any) {
    console.error('Error fetching hub cities:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data kota hub' },
      { status: 500 }
    );
  }
}
