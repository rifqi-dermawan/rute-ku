import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BookingStatus, PaymentStatus } from '@prisma/client'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { bookingId, publicToken, orderId: customOrderId } = body

    if (!bookingId && !publicToken && !customOrderId) {
      return NextResponse.json(
        { error: 'bookingId atau publicToken wajib disertakan.' },
        { status: 400 }
      )
    }

    // 1. Ambil data booking dari database
    const booking = await prisma.booking.findFirst({
      where: {
        OR: [
          bookingId ? { id: bookingId } : undefined,
          publicToken ? { publicToken } : undefined,
          customOrderId ? { payments: { some: { orderId: customOrderId } } } : undefined,
        ].filter(Boolean) as any,
      },
      include: {
        schedule: { include: { bus: true } },
        seats: true,
        payments: {
          where: { status: PaymentStatus.PENDING },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!booking) {
      return NextResponse.json({ error: 'Data booking tidak ditemukan.' }, { status: 404 })
    }

    if (booking.status === BookingStatus.CONFIRMED) {
      return NextResponse.json({ error: 'Pesanan ini sudah berhasil dibayar.' }, { status: 400 })
    }

    if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.EXPIRED) {
      return NextResponse.json(
        { error: 'Pesanan ini sudah dibatalkan atau kedaluwarsa.' },
        { status: 400 }
      )
    }

    const now = new Date()

    // 2. Proteksi Klik Ganda & Idempotensi: Cek apakah sudah ada pembayaran PENDING yang masih aktif
    const existingPending = booking.payments.find(
      (p) => p.status === PaymentStatus.PENDING && (!p.expiryTime || p.expiryTime > now)
    )

    if (existingPending && existingPending.qrUrl) {
      return NextResponse.json({
        orderId: existingPending.orderId,
        qrUrl: existingPending.qrUrl,
        amount: existingPending.amount,
        expiryTime: existingPending.expiryTime?.toISOString() ?? null,
        transactionId: existingPending.midtransTransactionId,
        isReused: true,
      })
    }

    // 3. Nominal diambil strictly dari database (grand_total)
    const amount = booking.grandTotal
    if (amount <= 0) {
      return NextResponse.json({ error: 'Nominal pembayaran tidak valid.' }, { status: 400 })
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY
    if (!serverKey || serverKey.includes('MASUKKAN_SERVER_KEY')) {
      return NextResponse.json(
        { error: 'MIDTRANS_SERVER_KEY belum dikonfigurasi di lingkungan aplikasi.' },
        { status: 500 }
      )
    }

    const authString = Buffer.from(`${serverKey.trim()}:`).toString('base64')
    const finalOrderId =
      customOrderId ||
      `RUTEKU-QRIS-${booking.code}-${Date.now().toString().slice(-6)}`

    // 4. Request QRIS ke Midtrans Core API Sandbox
    const payload = {
      payment_type: 'qris',
      transaction_details: {
        order_id: finalOrderId,
        gross_amount: amount,
      },
      qris: {
        acquirer: 'gopay',
      },
      customer_details: {
        first_name: booking.contactName,
        email: booking.contactEmail,
        phone: booking.contactPhone,
      },
      item_details: [
        {
          id: booking.scheduleId,
          price: amount,
          quantity: 1,
          name: `Tiket Bus RuteKu (${booking.code})`.slice(0, 50),
        },
      ],
    }

    const midtransRes = await fetch('https://api.sandbox.midtrans.com/v2/charge', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Basic ${authString}`,
      },
      body: JSON.stringify(payload),
    })

    const data = await midtransRes.json()

    if (!midtransRes.ok || (data.status_code && Number(data.status_code) >= 400)) {
      const msg =
        Array.isArray(data.error_messages)
          ? data.error_messages.join(', ')
          : data.status_message || data.message || 'Gagal membuat QRIS di Midtrans'
      return NextResponse.json({ error: msg }, { status: midtransRes.status || 400 })
    }

    const actions: Array<{ name: string; method: string; url: string }> = data.actions ?? []
    const qrUrl = actions.find((a) => a.name === 'generate-qr-code')?.url ?? null

    // Hitung waktu kedaluwarsa pembayaran (dari Midtrans atau 15 menit ke depan)
    let expiryDate: Date
    if (data.expiry_time) {
      expiryDate = new Date(data.expiry_time)
    } else {
      expiryDate = new Date(now.getTime() + 15 * 60 * 1000)
    }

    // 5. Simpan transaksi ke tabel payments dan perpanjang hold kursi dalam satu transaksi
    await prisma.$transaction(async (tx) => {
      // Buat record payment
      await tx.payment.create({
        data: {
          bookingId: booking.id,
          orderId: finalOrderId,
          paymentMethod: 'QRIS',
          amount,
          status: PaymentStatus.PENDING,
          qrUrl,
          midtransTransactionId: data.transaction_id ?? null,
          expiryTime: expiryDate,
        },
      })

      // Perpanjang masa tahan kursi di schedule_seats sampai masa berlaku pembayaran
      await tx.$executeRaw`
        UPDATE schedule_seats
        SET 
          hold_expires_at = ${expiryDate},
          updated_at = NOW()
        WHERE booking_id = ${booking.id};
      `
    })

    return NextResponse.json({
      orderId: finalOrderId,
      qrUrl,
      amount,
      expiryTime: expiryDate.toISOString(),
      transactionId: data.transaction_id ?? null,
      isReused: false,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Server error saat membuat QRIS' },
      { status: 500 }
    )
  }
}
