import { NextResponse } from 'next/server'
import { reportServerError } from '@/lib/analytics/server'
import { settleOverduePayments } from '@/lib/server/payments/reservations'
export const runtime = 'nodejs'
export async function GET(request: Request) {
  if (
    !process.env.CRON_SECRET ||
    request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`
  )
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  try {
    return NextResponse.json({ settled: await settleOverduePayments() })
  } catch (error) {
    reportServerError('PAYMENTS_SETTLE', error, request)
    return NextResponse.json({ error: 'No pudimos actualizar los pagos.' }, { status: 500 })
  }
}
