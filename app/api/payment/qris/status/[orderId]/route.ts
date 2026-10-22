import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params
    const serverKey = process.env.MIDTRANS_SERVER_KEY

    if (!serverKey) {
      return NextResponse.json({ error: 'Server key tidak tersedia' }, { status: 500 })
    }

    const authString = Buffer.from(`${serverKey.trim()}:`).toString('base64')

    const response = await fetch(
      `https://api.sandbox.midtrans.com/v2/${encodeURIComponent(orderId)}/status`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Basic ${authString}`,
        },
        // Jangan cache — kita butuh status terbaru setiap saat
        cache: 'no-store',
      }
    )

    const data = await response.json()

    // Normalkan status Midtrans ke tiga status app: pending | paid | expired
    const trxStatus: string = data.transaction_status ?? ''
    let status: 'pending' | 'paid' | 'expired' | 'failed'

    if (trxStatus === 'settlement' || trxStatus === 'capture') {
      status = 'paid'
    } else if (trxStatus === 'expire') {
      status = 'expired'
    } else if (trxStatus === 'cancel' || trxStatus === 'deny' || trxStatus === 'failure') {
      status = 'failed'
    } else {
      status = 'pending'
    }

    return NextResponse.json({
      status,
      transactionStatus: trxStatus,
      statusCode: data.status_code ?? null,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Gagal memeriksa status transaksi' },
      { status: 500 }
    )
  }
}
