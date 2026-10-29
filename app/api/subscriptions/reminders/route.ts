import { NextResponse } from 'next/server'
import { reportServerError } from '@/lib/analytics/server'
import { sendSubscriptionReminders } from '@/lib/server/subscriptions/reminders'
export const runtime = 'nodejs'
export async function GET(request: Request) {
  if (
    !process.env.CRON_SECRET ||
    request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`
  )
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  try {
    return NextResponse.json({ created: await sendSubscriptionReminders() })
  } catch (error) {
    reportServerError('SUBSCRIPTION_REMINDERS', error, request)
    return NextResponse.json({ error: 'No pudimos preparar los avisos.' }, { status: 500 })
  }
}
