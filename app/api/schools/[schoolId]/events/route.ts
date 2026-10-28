import { NextResponse } from 'next/server'
import {
  normalizeSchoolEventInput,
  SCHOOL_EVENT_ERRORS,
  splitSchoolEvents,
} from '@/lib/school-events'
import {
  getSchoolCaller,
  getSchoolMembership,
  isGlobalAdmin,
  requireSchoolAccess,
} from '@/lib/server/school-access'
import { createSchoolEvent, listSchoolEvents } from '@/lib/server/school-events'
import { getSchoolById, isAllowedSchoolImageUrl } from '@/lib/server/schools'

export const runtime = 'nodejs'
interface RouteProps {
  params: Promise<{ schoolId: string }>
}

export async function GET(request: Request, { params }: RouteProps) {
  const { schoolId } = await params
  const school = await getSchoolById(schoolId)
  if (!school) return NextResponse.json({ error: 'No encontrado.' }, { status: 404 })
  const caller = await getSchoolCaller(request)
  let isMember = false
  if (caller) {
    if (await isGlobalAdmin(caller.uid)) isMember = true
    else {
      const membership = await getSchoolMembership(schoolId, caller.uid)
      isMember = Boolean(membership && membership.status === 'active')
    }
  }
  if (!isMember && !school.isPublic)
    return NextResponse.json({ error: 'No encontrado.' }, { status: 404 })
  const scope = new URL(request.url).searchParams.get('scope') === 'past' ? 'past' : 'upcoming'
  const events = await listSchoolEvents(schoolId, { includePrivate: isMember })
  const split = splitSchoolEvents(events, school.timezone || 'America/Mexico_City')
  return NextResponse.json({ events: split[scope] })
}

export async function POST(request: Request, { params }: RouteProps) {
  const { schoolId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director'])
  if (access.response) return access.response
  const body = await request.json().catch(() => ({}))
  const result = normalizeSchoolEventInput(body, isAllowedSchoolImageUrl)
  if (!result.ok)
    return NextResponse.json({ error: SCHOOL_EVENT_ERRORS[result.reason] }, { status: 400 })
  const event = await createSchoolEvent(schoolId, access.caller.uid, result.value)
  return NextResponse.json({ event }, { status: 201 })
}
