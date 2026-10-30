import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  applyPaymentStatus,
  mapMidtransTransactionStatus,
  verifyMidtransSignature,
} from '@/lib/payment'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
      transaction_id,
    } = body

    if (!order_id || !status_code || !gross_amount || !signature_key) {
      return NextResponse.json(
        { error: 'Payload webhook tidak lengkap.' },
        { status: 400 }
      )
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY
    if (!serverKey) {
      return NextResponse.json(
        { error: 'MIDTRANS_SERVER_KEY tidak ditemukan.' },
        { status: 500 }
      )
    }

    // 1. Verifikasi Keaslian Signature Key (Anti-Spoofing / Anti-Pemalsuan)
    const isValidSignature = verifyMidtransSignature({
      orderId: order_id,
      statusCode: status_code,
      grossAmount: gross_amount,
      serverKey,
      signatureKey: signature_key,
    })

    if (!isValidSignature) {
      return NextResponse.json(
        { error: 'Signature key tidak valid (ditolak).' },
        { status: 403 }
      )
    }

    // 2. Cari data payment di database
    const payment = await prisma.payment.findUnique({
      where: { orderId: order_id },
    })

    if (!payment) {
      return NextResponse.json(
        { error: `Payment dengan order_id ${order_id} tidak ditemukan.` },
        { status: 404 }
      )
    }

    // 3. Verifikasi Kecocokan Nominal (Anti-Tampering Nominal)
    const webhookAmount = Math.round(Number(gross_amount))
    if (webhookAmount !== payment.amount) {
      return NextResponse.json(
        {
          error: `Nominal tidak cocok. Database: ${payment.amount}, Webhook: ${webhookAmount}`,
        },
        { status: 400 }
      )
    }

    // 4. Petakan status Midtrans ke enum Prisma
    const targetStatus = mapMidtransTransactionStatus(
      transaction_status,
      fraud_status
    )

    // 5. Eksekusi perubahan status terpusat melalui applyPaymentStatus
    const result = await applyPaymentStatus({
      orderId: order_id,
      targetStatus,
      rawPayload: body,
      midtransTransactionId: transaction_id,
    })

    return NextResponse.json({
      success: true,
      message: 'Notifikasi webhook Midtrans berhasil diproses.',
      data: result,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Server error saat memproses webhook.' },
      { status: 500 }
    )
  }
}

