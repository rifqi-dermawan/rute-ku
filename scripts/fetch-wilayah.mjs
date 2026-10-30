import fs from 'fs';
import path from 'path';

const dataDir = path.resolve('data/wilayah');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'RutekuApp/1.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i === retries) throw err;
      await delay(500);
    }
  }
}

async function main() {
  console.log('--- FETCH WILAYAH INDONESIA ---');
  let provinces = [];
  try {
    console.log('Fetching provinces from api.datawilayah.com...');
    const pData = await fetchWithRetry('https://api.datawilayah.com/api/provinsi.json');
    provinces = (pData.data || pData).map(p => ({
      code: p.kode_wilayah || p.id,
      name: p.nama_wilayah || p.name
    }));
  } catch (err) {
    console.warn('Fallback to emsifa provinces...', err.message);
    const pData = await fetchWithRetry('https://emsifa.github.io/api-wilayah-indonesia/api/provinces.json');
    provinces = pData.map(p => ({ code: p.id, name: p.name }));
  }

  fs.writeFileSync(path.join(dataDir, 'provinsi.json'), JSON.stringify(provinces, null, 2), 'utf-8');
  console.log(`Saved ${provinces.length} provinces.`);

  const allRegencies = [];

  for (const prov of provinces) {
    console.log(`Fetching regencies for ${prov.name} (${prov.code})...`);
    let regList = [];
    try {
      const rData = await fetchWithRetry(`https://api.datawilayah.com/api/kabupaten_kota/${prov.code}.json`);
      regList = (rData.data || rData).map(r => ({
        code: r.kode_wilayah || r.id,
        name: r.nama_wilayah || r.name,
        provinceCode: prov.code,
        provinceName: prov.name
      }));
    } catch (err) {
      console.warn(`Fallback to emsifa for ${prov.code}...`, err.message);
      try {
        const rData = await fetchWithRetry(`https://emsifa.github.io/api-wilayah-indonesia/api/regencies/${prov.code}.json`);
        regList = rData.map(r => ({
          code: r.id,
          name: r.name,
          provinceCode: prov.code,
          provinceName: prov.name
        }));
      } catch (e2) {
        console.error(`Failed to fetch regencies for ${prov.name}:`, e2.message);
      }
    }

    allRegencies.push(...regList);
    await delay(120); // Small polite delay
  }

  fs.writeFileSync(path.join(dataDir, 'kabupaten_kota.json'), JSON.stringify(allRegencies, null, 2), 'utf-8');
  console.log(`Total regencies/cities saved: ${allRegencies.length}`);
}

main().catch(err => {
  console.error('Fatal fetch wilayah:', err);
  process.exit(1);
});
