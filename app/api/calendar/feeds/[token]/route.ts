import { NextResponse } from 'next/server'
import { buildCalendarIcs, getBookingsForFeed, getFeedByToken } from '@/lib/server/calendar-feeds'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const feed = await getFeedByToken(token)
  if (!feed) {
    return new NextResponse('Calendario no encontrado.', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }

  const bookings = await getBookingsForFeed(feed)
  const ics = buildCalendarIcs(feed, bookings)

  return new NextResponse(ics, {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': 'inline; filename="nadamas.ics"',
      'cache-control': 'no-store, max-age=0',
    },
  })
}
