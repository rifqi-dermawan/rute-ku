import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { orderId, grossAmount, customerDetails, itemDetails } = body

    const serverKey = process.env.MIDTRANS_SERVER_KEY

    if (!serverKey || serverKey.includes('MASUKKAN_SERVER_KEY')) {
      return NextResponse.json(
        { error: 'MIDTRANS_SERVER_KEY belum diisi di .env.' },
        { status: 400 }
      )
    }

    const authString = Buffer.from(`${serverKey.trim()}:`).toString('base64')
    const amount = Math.max(1, Math.round(Number(grossAmount) || 0))
    const finalOrderId =
      orderId || `RUTEKU-QRIS-${Date.now()}-${Math.floor(Math.random() * 9999)}`

    const payload = {
      payment_type: 'qris',
      transaction_details: {
        order_id: finalOrderId,
        gross_amount: amount,
      },
      qris: {
        acquirer: 'gopay',
      },
      customer_details: customerDetails || {
        first_name: 'Penumpang RuteKu',
        email: 'customer@ruteku.id',
        phone: '081234567890',
      },
      item_details: itemDetails || [
        {
          id: 'BUS-TICKET',
          price: amount,
          quantity: 1,
          name: 'Tiket Bus Antarkota RuteKu',
        },
      ],
    }

    // Midtrans Core API untuk QRIS Charge
    const response = await fetch(
      'https://api.sandbox.midtrans.com/v2/charge',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Basic ${authString}`,
        },
        body: JSON.stringify(payload),
      }
    )

    const data = await response.json()

    if (!response.ok || (data.status_code && Number(data.status_code) >= 400)) {
      const msg =
        Array.isArray(data.error_messages)
          ? data.error_messages.join(', ')
          : data.status_message || data.message || 'Gagal membuat QRIS'
      return NextResponse.json({ error: msg }, { status: response.status || 400 })
    }

    // Ambil URL gambar QR dari array actions
    const actions: Array<{ name: string; method: string; url: string }> =
      data.actions ?? []
    const qrUrl =
      actions.find((a) => a.name === 'generate-qr-code')?.url ?? null

    return NextResponse.json({
      orderId: finalOrderId,
      qrUrl,
      amount,
      expiryTime: data.expiry_time ?? null,
      transactionId: data.transaction_id ?? null,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Server error saat membuat QRIS' },
      { status: 500 }
    )
  }
}
