import { NextResponse } from 'next/server'
import {
  buildSchoolCalendarIcs,
  getOccurrencesForSchoolFeed,
  getSchoolCalendarFeedByToken,
} from '@/lib/server/school-calendar'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const feed = await getSchoolCalendarFeedByToken(token)
  if (!feed)
    return new NextResponse('Calendario no encontrado.', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  const occurrences = await getOccurrencesForSchoolFeed(feed)
  return new NextResponse(buildSchoolCalendarIcs(feed, occurrences), {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': 'inline; filename="nadamas-escuela.ics"',
      'cache-control': 'no-store, max-age=0',
    },
  })
}
