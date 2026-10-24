/**
 * RuteKu E-Ticket Email Delivery Service
 *
 * Menggunakan Resend REST API (gratis & resmi) untuk pengiriman email nyata.
 * Jika RESEND_API_KEY belum dikonfigurasi di .env, sistem secara otomatis
 * berjalan dalam mode 'Simulation' yang aman dan tidak membuat error.
 */

export interface SendEticketParams {
  to: string
  bookingCode: string
  passengerNames: string
  seats: string
  from: string
  toCity: string
  date: string
  dep: string
  arr: string
  bus: string
  cls: string
  totalAmount: number
}

export async function sendEticketEmail(params: SendEticketParams): Promise<{
  success: boolean
  message: string
  id?: string
  simulated?: boolean
}> {
  const apiKey = process.env.RESEND_API_KEY

  const emailHtml = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>E-Tiket Resmi RuteKu - ${params.bookingCode}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F4F9FA; margin: 0; padding: 20px; color: #0F2A33; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #E4E7EC; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background-color: #0B6E78; color: #ffffff; padding: 28px 24px; text-align: center; }
    .header h1 { margin: 0 0 6px; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 0; font-size: 13px; opacity: 0.9; }
    .content { padding: 24px; }
    .badge-code { display: inline-block; background-color: #E6F4F5; color: #0B6E78; font-weight: 800; font-family: monospace; font-size: 16px; padding: 6px 14px; border-radius: 8px; margin: 12px 0 20px; border: 1px solid #B8E1E4; }
    .trip-card { background-color: #F8FBFB; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; margin-bottom: 20px; }
    .route-title { font-size: 18px; font-weight: 800; margin: 0 0 8px; color: #0F2A33; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
    .info-label { color: #64748B; }
    .info-val { font-weight: 700; color: #0F2A33; text-align: right; }
    .divider { height: 1px; background-color: #E2E8F0; margin: 16px 0; border: none; }
    .instructions { background-color: #FEF6EE; border: 1px solid #F9DBAF; border-radius: 10px; padding: 14px; font-size: 12px; color: #93370D; margin-top: 20px; line-height: 1.5; }
    .footer { text-align: center; padding: 20px; font-size: 11px; color: #94A3B8; border-top: 1px solid #F1F5F9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>E-Tiket Resmi RuteKu</h1>
      <p>Pembayaran Berhasil · Tiket Anda Sudah Terkonfirmasi</p>
    </div>

    <div class="content">
      <div style="text-align: center;">
        <span style="font-size: 12px; color: #64748B; text-transform: uppercase; font-weight: 700;">Kode Booking Anda</span><br>
        <span class="badge-code">${params.bookingCode}</span>
      </div>

      <div class="trip-card">
        <div class="route-title">${params.from} &rarr; ${params.toCity}</div>
        <div class="info-row">
          <span class="info-label">Jadwal Keberangkatan</span>
          <span class="info-val">${params.date} (${params.dep} WIB)</span>
        </div>
        <div class="info-row">
          <span class="info-label">Armada Bus</span>
          <span class="info-val">${params.bus} (${params.cls})</span>
        </div>
        <div class="info-row">
          <span class="info-label">Nomor Kursi</span>
          <span class="info-val">${params.seats}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Nama Penumpang</span>
          <span class="info-val">${params.passengerNames}</span>
        </div>

        <hr class="divider">

        <div class="info-row" style="font-size: 15px;">
          <span class="info-label" style="font-weight: 700; color: #0F2A33;">Total Dibayar</span>
          <span class="info-val" style="color: #0B6E78; font-size: 16px;">Rp ${params.totalAmount.toLocaleString('id-ID')}</span>
        </div>
      </div>

      <div class="instructions">
        <strong>Petunjuk Check-in di Terminal:</strong><br>
        1. Tunjukkan e-tiket ini atau kode booking <strong>${params.bookingCode}</strong> kepada petugas agen di terminal.<br>
        2. Harap tiba di terminal keberangkatan minimal 30 menit sebelum bus berangkat.<br>
        3. Siapkan kartu identitas (KTP) asli yang sesuai dengan nama penumpang.
      </div>
    </div>

    <div class="footer">
      Email ini dikirim otomatis oleh sistem RuteKu. Butuh bantuan? Kunjungi ruteku.id/help.<br>
      &copy; 2026 RuteKu Indonesia. Hak cipta dilindungi undang-undang.
    </div>
  </div>
</body>
</html>
`

  // Jika belum ada RESEND_API_KEY, jalankan simulasi pengiriman yang aman
  if (!apiKey) {
    console.log(`[RuteKu Email Simulation] Mengirimkan e-tiket ke: ${params.to}`)
    console.log(`[RuteKu Email Simulation] Kode Booking: ${params.bookingCode} | Kursi: ${params.seats}`)
    return {
      success: true,
      simulated: true,
      message: `Simulasi pengiriman e-tiket ke ${params.to} berhasil. Tambahkan RESEND_API_KEY di file .env untuk mengirim email nyata.`,
    }
  }

  // Jika RESEND_API_KEY tersedia, panggil Resend REST API langsung
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'RuteKu E-Ticket <onboarding@resend.dev>', // Default Resend test domain
        to: [params.to],
        subject: `E-Tiket Bus RuteKu: ${params.from} ke ${params.toCity} [${params.bookingCode}]`,
        html: emailHtml,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('[Resend Error]', data)
      return {
        success: false,
        message: data.message || 'Gagal mengirim email melalui Resend.',
      }
    }

    return {
      success: true,
      id: data.id,
      message: `E-tiket asli berhasil dikirimkan ke ${params.to} via Resend.`,
    }
  } catch (err: any) {
    console.error('[Email Dispatch Error]', err)
    return {
      success: false,
      message: err.message || 'Kendala koneksi ke server email.',
    }
  }
}

/**
 * Mengirimkan kode OTP verifikasi via Resend REST API ke email pengguna
 */
export async function sendOtpEmail({
  to,
  otp,
}: {
  to: string
  otp: string
}): Promise<{
  success: boolean
  message: string
  id?: string
  simulated?: boolean
  error?: string
}> {
  const apiKey = process.env.RESEND_API_KEY

  const emailHtml = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>Kode Verifikasi RuteKu - ${otp}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F4F9FA; margin: 0; padding: 24px; color: #0F2A33; }
    .container { max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #E4E7EC; box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
    .header { background-color: #0B6E78; color: #ffffff; padding: 28px 20px; text-align: center; }
    .header h1 { margin: 0 0 4px; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 0; font-size: 13px; opacity: 0.9; }
    .content { padding: 32px 24px; text-align: center; }
    .otp-box { display: inline-block; background-color: #E6F4F5; color: #0B6E78; font-weight: 900; font-family: monospace; font-size: 32px; letter-spacing: 8px; padding: 14px 28px; border-radius: 12px; margin: 20px 0; border: 1.5px dashed #0B6E78; }
    .desc { font-size: 13px; color: #64748B; line-height: 1.6; margin-bottom: 24px; }
    .warning { background-color: #FEF6EE; border: 1px solid #F9DBAF; border-radius: 10px; padding: 12px; font-size: 12px; color: #93370D; text-align: left; }
    .footer { text-align: center; padding: 16px; font-size: 11px; color: #94A3B8; border-top: 1px solid #F1F5F9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>RuteKu Autentikasi</h1>
      <p>Kode Verifikasi Masuk Akun Penumpang</p>
    </div>
    <div class="content">
      <p class="desc">
        Halo! Anda menerima email ini karena ada permintaan masuk atau verifikasi pemesanan tiket bus di RuteKu. Gunakan kode verifikasi (OTP) berikut untuk melanjutkan:
      </p>
      <div class="otp-box">${otp}</div>
      <div class="warning">
        <strong>Penting:</strong> Kode verifikasi ini hanya berlaku selama <strong>10 menit</strong>. Jangan pernah membagikan kode rahasia ini kepada siapapun demi keamanan akun Anda.
      </div>
    </div>
    <div class="footer">
      Email ini dikirim otomatis oleh sistem RuteKu Transportasi Indonesia.<br>
      &copy; 2026 RuteKu Indonesia. Hak cipta dilindungi undang-undang.
    </div>
  </div>
</body>
</html>
`

  if (!apiKey) {
    console.log(`[RuteKu OTP Simulation] Kode OTP untuk ${to}: ${otp}`)
    return {
      success: true,
      simulated: true,
      message: `Kode verifikasi ${otp} disimulasikan untuk ${to}.`,
    }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'RuteKu Verifikasi <onboarding@resend.dev>',
        to: [to],
        subject: `Kode Verifikasi RuteKu: ${otp}`,
        html: emailHtml,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.warn('[Resend OTP Warning]', data)
      return {
        success: false,
        message: data.message || 'Gagal mengirim kode OTP via Resend.',
        error: data.message,
      }
    }

    return {
      success: true,
      id: data.id,
      message: `Kode verifikasi berhasil dikirimkan ke ${to}.`,
    }
  } catch (err: any) {
    console.error('[OTP Dispatch Error]', err)
    return {
      success: false,
      message: err.message || 'Gagal menghubungi server email.',
      error: err.message,
    }
  }
}

