/**
 * Konfigurasi Transportasi Bus & Perhitungan Durasi / Tarif
 */

export const BUS_DURATION_FACTOR = 1.3;
export const TICKET_PRICE_PER_KM = 700; // Nilai awal simulasi Rp700/km
export const MIN_TICKET_PRICE = 50000;  // Minimal Rp50.000

/**
 * Estimasi durasi bus berdasarkan durasi mobil standar OSRM.
 * Dibulatkan ke atas (Math.ceil).
 * Catatan: database menyimpan osrmDurationMinutes murni tanpa dikali faktor ini.
 */
export function estimateBusDurationMinutes(osrmMinutes: number): number {
  return Math.ceil(osrmMinutes * BUS_DURATION_FACTOR);
}

/**
 * Perhitungan harga tiket bus berdasarkan jarak (km).
 * Dibulatkan ke kelipatan Rp1.000 terdekat, dengan batas minimal Rp50.000.
 */
export function calculateTicketPrice(distanceKm: number): number {
  const rawPrice = distanceKm * TICKET_PRICE_PER_KM;
  const rounded = Math.round(rawPrice / 1000) * 1000;
  return Math.max(MIN_TICKET_PRICE, rounded);
}
