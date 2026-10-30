import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { orderId, grossAmount, customerDetails, itemDetails } = body

    const serverKey = process.env.MIDTRANS_SERVER_KEY

    if (!serverKey || serverKey.includes('MASUKKAN_SERVER_KEY')) {
      return NextResponse.json(
        {
          error: 'MIDTRANS_SERVER_KEY belum diatur di file environment.',
          isKeyMissing: true,
        },
        { status: 400 }
      )
    }

    const authString = Buffer.from(`${serverKey.trim()}:`).toString('base64')
    const amount = Math.max(1, Math.round(Number(grossAmount) || 0))

    const payload = {
      transaction_details: {
        order_id: orderId || `RUTEKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        gross_amount: amount,
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

    const response = await fetch('https://app.sandbox.midtrans.com/snap/v1/transactions', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Basic ${authString}`,
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (!response.ok) {
      const errorMsg = Array.isArray(data.error_messages)
        ? data.error_messages.join(', ')
        : data.message || 'Gagal membuat transaksi Midtrans Snap'
      return NextResponse.json({ error: errorMsg }, { status: response.status })
    }

    return NextResponse.json({
      token: data.token,
      redirect_url: data.redirect_url,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Terjadi kesalahan server saat menghubungi Midtrans' },
      { status: 500 }
    )
  }
}

