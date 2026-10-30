import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { applyPaymentStatus, mapMidtransTransactionStatus } from '@/lib/payment'
import { PaymentStatus } from '@prisma/client'

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json()
    if (!orderId) {
      return NextResponse.json({ error: 'orderId wajib disertakan.' }, { status: 400 })
    }

    const payment = await prisma.payment.findUnique({
      where: { orderId },
      include: { booking: true },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Pembayaran tidak ditemukan.' }, { status: 404 })
    }

    if (payment.status === PaymentStatus.SUCCESS) {
      return NextResponse.json({ success: true, status: 'SUCCESS', message: 'Pembayaran sudah sukses.' })
    }

    const qrUrl = payment.qrUrl
    if (!qrUrl) {
      return NextResponse.json({ error: 'QR URL tidak ditemukan untuk pesanan ini.' }, { status: 400 })
    }

    // Panggil Midtrans QRIS Simulator v2 API secara programmatic
    try {
      const simStep1 = await fetch('https://simulator.sandbox.midtrans.com/v2/qris/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ qrCodeUrl: qrUrl }),
      })

      const simHtml = await simStep1.text()
      const refIdMatch = simHtml.match(/name="referenceId"\s+type="hidden"\s+value="([^"]+)"/)
      const exploreDataMatch = simHtml.match(/name="exploreData"\s+type="hidden"\s+value="([^"]+)"/)

      if (refIdMatch && exploreDataMatch) {
        const referenceId = refIdMatch[1]
        const exploreData = exploreDataMatch[1].replace(/&quot;/g, '"')

        await fetch('https://simulator.sandbox.midtrans.com/v2/qris/payment/gopay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            referenceId,
            exploreData,
            issuer: 'gopay',
          }),
        })
      }
    } catch (simErr) {
      console.warn('Simulator HTTP fetch error:', simErr)
    }

    // Ambil status terkini dari Midtrans Sandbox
    const serverKey = process.env.MIDTRANS_SERVER_KEY
    if (serverKey) {
      const authString = Buffer.from(`${serverKey.trim()}:`).toString('base64')
      const statusRes = await fetch(
        `https://api.sandbox.midtrans.com/v2/${encodeURIComponent(orderId)}/status`,
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Basic ${authString}`,
          },
          cache: 'no-store',
        }
      )
      const data = await statusRes.json()
      const mappedStatus = mapMidtransTransactionStatus(data.transaction_status, data.fraud_status)
      await applyPaymentStatus({
        orderId,
        targetStatus: mappedStatus,
        rawPayload: data,
        midtransTransactionId: data.transaction_id,
      })
    }

    return NextResponse.json({
      success: true,
      status: 'SUCCESS',
      message: 'Simulasi pembayaran Midtrans berhasil diselesaikan!',
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Gagal menjalankan simulasi pembayaran.' },
      { status: 500 }
    )
  }
}
