import { NextResponse } from 'next/server'
import { schoolMembershipHasRole } from '@/lib/school'
import { requireSchoolAccess } from '@/lib/server/school-access'
import {
  getSchoolCalendarFeed,
  revokeSchoolCalendarFeed,
  upsertSchoolCalendarFeed,
} from '@/lib/server/school-calendar'

export const runtime = 'nodejs'

interface RouteProps {
  params: Promise<{ schoolId: string }>
}

function payload(request: Request, feed: Awaited<ReturnType<typeof getSchoolCalendarFeed>>) {
  return {
    connected: Boolean(feed?.active),
    calendarUrl: feed?.active
      ? new URL(`/api/school-calendar/${feed.token}.ics`, request.url).toString()
      : null,
    updatedAt: feed?.updatedAt || null,
  }
}

export async function GET(request: Request, { params }: RouteProps) {
  const { schoolId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director', 'teacher', 'student'])
  if (access.response) return access.response
  return NextResponse.json(
    payload(request, await getSchoolCalendarFeed(schoolId, access.caller.uid))
  )
}

export async function POST(request: Request, { params }: RouteProps) {
  const { schoolId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director', 'teacher', 'student'])
  if (access.response) return access.response
  const role = schoolMembershipHasRole(access.membership, 'director')
    ? 'director'
    : schoolMembershipHasRole(access.membership, 'teacher')
      ? 'teacher'
      : schoolMembershipHasRole(access.membership, 'student')
        ? 'student'
        : access.globalAdmin
          ? 'director'
          : 'student'
  return NextResponse.json(
    payload(request, await upsertSchoolCalendarFeed(schoolId, access.caller.uid, role))
  )
}

export async function DELETE(request: Request, { params }: RouteProps) {
  const { schoolId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director', 'teacher', 'student'])
  if (access.response) return access.response
  await revokeSchoolCalendarFeed(schoolId, access.caller.uid)
  return NextResponse.json({ connected: false, calendarUrl: null })
}
