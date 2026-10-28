import { NextResponse } from 'next/server'
import { normalizeSchoolEventInput, SCHOOL_EVENT_ERRORS } from '@/lib/school-events'
import { requireSchoolAccess } from '@/lib/server/school-access'
import { deleteSchoolEvent, updateSchoolEvent } from '@/lib/server/school-events'
import { isAllowedSchoolImageUrl } from '@/lib/server/schools'

export const runtime = 'nodejs'
interface RouteProps {
  params: Promise<{ schoolId: string; eventId: string }>
}

const NOT_FOUND = { error: 'No encontrado.' }

export async function PATCH(request: Request, { params }: RouteProps) {
  const { schoolId, eventId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director'])
  if (access.response) return access.response
  const body = await request.json().catch(() => ({}))
  const result = normalizeSchoolEventInput(body, isAllowedSchoolImageUrl)
  if (!result.ok)
    return NextResponse.json({ error: SCHOOL_EVENT_ERRORS[result.reason] }, { status: 400 })
  const event = await updateSchoolEvent(schoolId, eventId, result.value)
  if (!event) return NextResponse.json(NOT_FOUND, { status: 404 })
  return NextResponse.json({ event })
}

export async function DELETE(request: Request, { params }: RouteProps) {
  const { schoolId, eventId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director'])
  if (access.response) return access.response
  const deleted = await deleteSchoolEvent(schoolId, eventId)
  if (!deleted) return NextResponse.json(NOT_FOUND, { status: 404 })
  return NextResponse.json({ ok: true })
}
