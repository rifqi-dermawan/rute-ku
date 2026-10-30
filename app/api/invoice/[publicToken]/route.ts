import { NextRequest } from 'next/server'
import { GET as handleInvoiceGet } from '@/app/api/bookings/[id]/invoice/route'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ publicToken: string }> }
) {
  const { publicToken } = await params
  return handleInvoiceGet(req, { params: Promise.resolve({ id: publicToken }) })
}

