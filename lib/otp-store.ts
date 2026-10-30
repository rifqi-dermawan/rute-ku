/**
 * In-memory OTP Store for email authentication
 * Stored globally to persist across Next.js API route calls in the process
 */
declare global {
  // eslint-disable-next-line no-var
  var __ruteku_otp_store: Map<string, { otp: string; expiresAt: number }> | undefined
}

export const otpStore: Map<string, { otp: string; expiresAt: number }> =
  globalThis.__ruteku_otp_store || new Map<string, { otp: string; expiresAt: number }>()

if (process.env.NODE_ENV !== 'production') {
  globalThis.__ruteku_otp_store = otpStore
}

export function saveOtp(email: string, otp: string, durationMinutes = 10) {
  const normalized = email.trim().toLowerCase()
  const expiresAt = Date.now() + durationMinutes * 60 * 1000
  otpStore.set(normalized, { otp, expiresAt })
}

export function verifyOtp(email: string, enteredOtp: string): { valid: boolean; reason?: string } {
  const normalized = email.trim().toLowerCase()
  const entry = otpStore.get(normalized)

  if (!entry) {
    return { valid: false, reason: 'Kode OTP tidak ditemukan atau belum diminta.' }
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(normalized)
    return { valid: false, reason: 'Kode OTP telah kadaluarsa (melewati 10 menit). Silakan minta kode baru.' }
  }

  if (entry.otp.trim() !== enteredOtp.trim()) {
    return { valid: false, reason: 'Kode OTP yang Anda masukkan salah. Periksa kembali email Anda.' }
  }

  // OTP is valid -> delete after single use
  otpStore.delete(normalized)
  return { valid: true }
}

