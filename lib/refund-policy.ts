/**
 * Kebijakan Pembatalan dan Pengembalian Dana (Refund Policy) RuteKu
 *
 * Aturan Kebijakan:
 * 1. Jadwal dibatalkan oleh operator atau terdeteksi pembayaran ganda: 100%
 * 2. Permintaan >= 24 jam sebelum keberangkatan: 75%
 * 3. Permintaan 6 jam s.d. < 24 jam sebelum keberangkatan: 50%
 * 4. Permintaan < 6 jam sebelum keberangkatan: 0% (tidak dapat dibatalkan)
 *
 * Ketentuan Finansial:
 * - Pengembalian dana hanya dihitung dari `ticket_total`.
 * - Biaya layanan (`service_fee`) bersifat non-refundable (tidak dikembalikan).
 * - Hasil perhitungan dibulatkan ke bawah (Math.floor) ke bilangan bulat Rupiah.
 */

export interface RefundPolicyRule {
  id: string
  title: string
  percentage: number
  condition: string
  description: string
}

export const REFUND_POLICY_RULES: RefundPolicyRule[] = [
  {
    id: 'operator_cancel',
    title: 'Pembatalan oleh Operator / Pembayaran Ganda',
    percentage: 100,
    condition: 'Jadwal dibatalkan operator atau terbukti pembayaran ganda',
    description: 'Pengembalian 100% dari total harga tiket bus.',
  },
  {
    id: 'gt_24h',
    title: 'Lebih dari atau Sama dengan 24 Jam',
    percentage: 75,
    condition: '≥ 24 jam sebelum jadwal keberangkatan bus',
    description: 'Pengembalian 75% dari total harga tiket bus.',
  },
  {
    id: 'between_6_24h',
    title: '6 Jam sampai kurang dari 24 Jam',
    percentage: 50,
    condition: '6 jam s.d. < 24 jam sebelum jadwal keberangkatan bus',
    description: 'Pengembalian 50% dari total harga tiket bus.',
  },
  {
    id: 'lt_6h',
    title: 'Kurang dari 6 Jam',
    percentage: 0,
    condition: '< 6 jam sebelum keberangkatan bus',
    description: 'Tiket hangus dan tidak dapat dibatalkan (0%).',
  },
]

export const REFUND_POLICY_DISCLAIMER =
  'Pengembalian dana dihitung secara murni dari harga tiket (ticket total). Biaya layanan tidak dapat dikembalikan dan nominal akhir dibulatkan ke bawah ke Rupiah terdekat.'

export interface RefundCalculationParams {
  departureTime: Date | string
  ticketTotal: number
  isOperatorCancelled?: boolean
  isDuplicatePayment?: boolean
  requestTime?: Date | string
}

export interface RefundCalculationResult {
  eligible: boolean
  percentage: number
  refundAmount: number
  hoursToDeparture: number
  policyTier:
    | 'OPERATOR_CANCELLED'
    | 'DUPLICATE_PAYMENT'
    | 'OVER_24_HOURS'
    | 'BETWEEN_6_AND_24_HOURS'
    | 'LESS_THAN_6_HOURS'
  reason: string
  policyText: string
}

export function calculateRefund({
  departureTime,
  ticketTotal,
  isOperatorCancelled = false,
  isDuplicatePayment = false,
  requestTime = new Date(),
}: RefundCalculationParams): RefundCalculationResult {
  const dep = new Date(departureTime)
  const req = new Date(requestTime)

  const diffMs = dep.getTime() - req.getTime()
  const hoursToDeparture = diffMs / (1000 * 60 * 60)

  // 1. Kasus Khusus: Pembatalan oleh Operator (100%)
  if (isOperatorCancelled) {
    const percentage = 100
    const refundAmount = Math.floor((ticketTotal * percentage) / 100)
    return {
      eligible: true,
      percentage,
      refundAmount,
      hoursToDeparture,
      policyTier: 'OPERATOR_CANCELLED',
      reason: 'Jadwal perjalanan dibatalkan oleh operator bus.',
      policyText: 'Pengembalian 100% harga tiket karena pembatalan operasional.',
    }
  }

  // 2. Kasus Khusus: Pembayaran Ganda (100%)
  if (isDuplicatePayment) {
    const percentage = 100
    const refundAmount = Math.floor((ticketTotal * percentage) / 100)
    return {
      eligible: true,
      percentage,
      refundAmount,
      hoursToDeparture,
      policyTier: 'DUPLICATE_PAYMENT',
      reason: 'Terjadi transaksi pembayaran ganda untuk pesanan yang sama.',
      policyText: 'Pengembalian 100% harga tiket karena pembayaran ganda.',
    }
  }

  // 3. Batas Waktu Normal
  if (hoursToDeparture >= 24) {
    const percentage = 75
    const refundAmount = Math.floor((ticketTotal * percentage) / 100)
    return {
      eligible: true,
      percentage,
      refundAmount,
      hoursToDeparture,
      policyTier: 'OVER_24_HOURS',
      reason: 'Pembatalan diajukan 24 jam atau lebih sebelum keberangkatan.',
      policyText: 'Pengembalian 75% harga tiket.',
    }
  }

  if (hoursToDeparture >= 6) {
    const percentage = 50
    const refundAmount = Math.floor((ticketTotal * percentage) / 100)
    return {
      eligible: true,
      percentage,
      refundAmount,
      hoursToDeparture,
      policyTier: 'BETWEEN_6_AND_24_HOURS',
      reason: 'Pembatalan diajukan antara 6 jam hingga kurang dari 24 jam sebelum keberangkatan.',
      policyText: 'Pengembalian 50% harga tiket.',
    }
  }

  // 4. Kurang dari 6 jam: Ditolak / Tidak Berhak Refund
  return {
    eligible: false,
    percentage: 0,
    refundAmount: 0,
    hoursToDeparture,
    policyTier: 'LESS_THAN_6_HOURS',
    reason: 'Pembatalan ditolak karena diajukan kurang dari 6 jam sebelum keberangkatan.',
    policyText: 'Tiket tidak dapat dibatalkan (kurang dari 6 jam sebelum berangkat).',
  }
}

