import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  applyPaymentStatus,
  mapMidtransTransactionStatus,
} from '@/lib/payment'
import { PaymentStatus } from '@prisma/client'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params
    const serverKey = process.env.MIDTRANS_SERVER_KEY

    if (!serverKey) {
      return NextResponse.json(
        { error: 'MIDTRANS_SERVER_KEY belum diatur.' },
        { status: 500 }
      )
    }

    // 1. Cek status di database terlebih dahulu
    const existingPayment = await prisma.payment.findUnique({
      where: { orderId },
      include: { booking: true },
    })

    if (!existingPayment) {
      return NextResponse.json(
        { error: 'Transaksi payment tidak ditemukan di database.' },
        { status: 404 }
      )
    }

    // Jika di database sudah berstatus akhir (SUCCESS / EXPIRED / FAILED), kembalikan langsung
    if (existingPayment.status !== PaymentStatus.PENDING) {
      return NextResponse.json({
        orderId,
        status: existingPayment.status,
        bookingStatus: existingPayment.booking.status,
        paidAt: existingPayment.paidAt,
        amount: existingPayment.amount,
      })
    }

    // 2. Jika masih PENDING, periksa status terkini dari Midtrans Sandbox API
    const authString = Buffer.from(`${serverKey.trim()}:`).toString('base64')
    const midtransRes = await fetch(
      `https://api.sandbox.midtrans.com/v2/${encodeURIComponent(orderId)}/status`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Basic ${authString}`,
        },
        cache: 'no-store',
      }
    )

    const data = await midtransRes.json()
    const trxStatus: string = data.transaction_status ?? ''
    const fraudStatus: string | undefined = data.fraud_status

    const mappedStatus = mapMidtransTransactionStatus(trxStatus, fraudStatus)

    // 3. Jika status Midtrans sudah bukan PENDING, sinkronkan via applyPaymentStatus
    if (mappedStatus !== PaymentStatus.PENDING) {
      const applyResult = await applyPaymentStatus({
        orderId,
        targetStatus: mappedStatus,
        rawPayload: data,
        midtransTransactionId: data.transaction_id,
      })

      return NextResponse.json({
        orderId,
        status: applyResult.currentStatus,
        bookingStatus: applyResult.bookingStatus,
        statusCode: data.status_code ?? null,
      })
    }

    return NextResponse.json({
      orderId,
      status: PaymentStatus.PENDING,
      bookingStatus: existingPayment.booking.status,
      statusCode: data.status_code ?? null,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Gagal memeriksa status transaksi payment' },
      { status: 500 }
    )
  }
}
