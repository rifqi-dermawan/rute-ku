import fs from 'fs';
import path from 'path';

const hubCitiesPath = path.resolve('data/hub-cities.json');
const routesSnapshotPath = path.resolve('data/routes.json');

const hubs = JSON.parse(fs.readFileSync(hubCitiesPath, 'utf-8'));
const contactEmail = process.env.OSRM_CONTACT_EMAIL || 'support@ruteku.id';
const force = process.argv.includes('--force');

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchRouteWithRetry(fromHub, toHub, retries = 2) {
  const url = `https://router.project-osrm.org/route/v1/driving/${fromHub.lng},${fromHub.lat};${toHub.lng},${toHub.lat}?overview=false`;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, {
        headers: {
          'User-Agent': `RutekuApp/1.0 (${contactEmail})`
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.code !== 'Ok' || !data.routes || !data.routes[0]) {
        throw new Error(`OSRM response code: ${data.code}`);
      }

      const route = data.routes[0];
      return {
        distanceKm: Math.max(1, Math.round(route.distance / 1000)),
        osrmDurationMinutes: Math.max(1, Math.round(route.duration / 60)),
        provider: 'osrm'
      };
    } catch (err) {
      if (attempt === retries) {
        console.error(`[OSRM FAILED] ${fromHub.name} -> ${toHub.name}: ${err.message}`);
        return null;
      }
      await delay(1000);
    }
  }
}

async function main() {
  console.log(`--- COMPUTING OSRM ROUTES FOR 10 HUBS ---`);
  console.log(`Contact Email: ${contactEmail}`);
  console.log(`Force refresh: ${force}`);

  let existingRoutes = [];
  if (fs.existsSync(routesSnapshotPath)) {
    try {
      existingRoutes = JSON.parse(fs.readFileSync(routesSnapshotPath, 'utf-8'));
      console.log(`Loaded ${existingRoutes.length} existing routes from snapshot.`);
    } catch {
      existingRoutes = [];
    }
  }

  const routeMap = new Map();
  for (const r of existingRoutes) {
    routeMap.set(`${r.originHub}->${r.destinationHub}`, r);
  }

  const allPairs = [];
  for (let i = 0; i < hubs.length; i++) {
    for (let j = 0; j < hubs.length; j++) {
      if (i !== j) {
        allPairs.push({ from: hubs[i], to: hubs[j] });
      }
    }
  }

  console.log(`Total directional pairs to verify: ${allPairs.length}`);

  let fetchedCount = 0;
  for (const pair of allPairs) {
    const key = `${pair.from.name}->${pair.to.name}`;
    if (!force && routeMap.has(key)) {
      continue;
    }

    console.log(`Fetching OSRM route: ${pair.from.name} -> ${pair.to.name}...`);
    const result = await fetchRouteWithRetry(pair.from, pair.to);
    if (result) {
      routeMap.set(key, {
        originHub: pair.from.name,
        originMatch: pair.from.match,
        destinationHub: pair.to.name,
        destinationMatch: pair.to.match,
        distanceKm: result.distanceKm,
        osrmDurationMinutes: result.osrmDurationMinutes,
        provider: result.provider,
        computedAt: new Date().toISOString()
      });
      fetchedCount++;
    }

    await delay(1200); // 1.2s polite delay per OSRM usage policy
  }

  const outputList = Array.from(routeMap.values());
  fs.writeFileSync(routesSnapshotPath, JSON.stringify(outputList, null, 2), 'utf-8');
  console.log(`Saved ${outputList.length} routes to data/routes.json (Newly fetched: ${fetchedCount})`);

  console.log('\n--- 10 CONTOH JARAK & DURASI OSRM ---');
  const sampleKeys = [
    'Jakarta->Bandung',
    'Bandung->Jakarta',
    'Jakarta->Bogor',
    'Jakarta->Cirebon',
    'Jakarta->Semarang',
    'Jakarta->Yogyakarta',
    'Bandung->Yogyakarta',
    'Semarang->Surabaya',
    'Yogyakarta->Surabaya',
    'Malang->Surabaya'
  ];

  const samples = [];
  for (const k of sampleKeys) {
    const r = routeMap.get(k);
    if (r) {
      samples.push({
        Rute: `${r.originHub} -> ${r.destinationHub}`,
        'Jarak (km)': r.distanceKm,
        'Durasi OSRM (menit)': r.osrmDurationMinutes,
        'Estimasi Bus (faktor 1.3)': Math.ceil(r.osrmDurationMinutes * 1.3) + ' menit',
        'Validitas Jakarta-Bandung': (r.originHub === 'Jakarta' && r.destinationHub === 'Bandung')
          ? (r.distanceKm >= 140 && r.distanceKm <= 190 ? 'VALID (150-180km)' : 'CEK MANUAL')
          : '-'
      });
    }
  }
  console.table(samples);
}

main().catch(err => {
  console.error('Fatal compute routes:', err);
  process.exit(1);
});
