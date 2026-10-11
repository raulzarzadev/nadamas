import { NextResponse } from 'next/server'
import { parseCredentialQr } from '@/lib/athlete-identity'
import type { Booking } from '@/lib/coach-booking'
import { ensureAthleteIdentity, findAthleteIdentity } from '@/lib/server/athlete-identities'
import { adminDb } from '@/lib/server/firebase-admin'
import { requirePersonalCoach } from '@/lib/server/personal-class-access'
import { PATCH as updateBooking } from '../agenda/bookings/route'

export const runtime = 'nodejs'
const headers = { 'Cache-Control': 'private, no-store' }
const classId = (booking: Booking) => `${booking.date}|${booking.startTime}|${booking.groupType}`
const profile = (booking: Booking) => ({
  id: booking.additionalProfileId || booking.athleteProfileId || booking.athleteId,
  type:
    booking.additionalProfileId ||
    (booking.athleteProfileId && booking.athleteProfileId !== booking.athleteId)
      ? ('additional' as const)
      : ('user' as const),
})
async function personalBookings(uid: string) {
  const snapshot = await adminDb.collection('bookings').where('coachId', '==', uid).get()
  return snapshot.docs
    .map((doc) => ({ ...doc.data(), id: doc.id }) as Booking)
    .filter((booking) => !booking.schoolId && booking.status !== 'cancelled')
}
export async function GET(request: Request) {
  try {
    const access = await requirePersonalCoach(request)
    if (access.response) return access.response
    const query = new URL(request.url).searchParams
    const occurrenceId = query.get('occurrenceId') || ''
    const date = occurrenceId.split('|')[0] || query.get('date') || ''
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
      return NextResponse.json({ error: 'Selecciona una fecha.' }, { status: 400 })
    const bookings = (await personalBookings(access.uid)).filter((booking) => booking.date === date)
    const groups = new Map<string, Booking[]>()
    for (const booking of bookings)
      groups.set(classId(booking), [...(groups.get(classId(booking)) || []), booking])
    const classes = [...groups.entries()].map(([id, group]) => ({
      id,
      date,
      startTime: group[0].startTime,
      endTime: group[0].endTime,
      type: group[0].groupType === 'grupal' ? 'group' : 'individual',
      teacherIds: [access.uid],
      studentIds: group.map((booking) => booking.id),
      status: 'scheduled',
    }))
    const base = {
      classes,
      coachNames: { [access.uid]: access.user.displayName || access.user.name || 'Entrenador' },
    }
    if (!occurrenceId) return NextResponse.json(base, { headers })
    const selected = groups.get(occurrenceId)
    if (!selected)
      return NextResponse.json({ error: 'No encontramos esta clase.' }, { status: 404 })
    const roster = await Promise.all(
      selected.map(async (booking) => {
        const identity = profile(booking)
        const credential = await ensureAthleteIdentity(identity.type, identity.id).catch(() => null)
        return {
          studentId: booking.id,
          name: booking.athleteName,
          numericId: credential?.numericId,
          inSchool: true,
          enrolled: true,
          pending: booking.status === 'pending',
          attended: booking.attended === true,
        }
      })
    )
    const mode = query.get('mode'),
      value = (query.get('query') || '').trim()
    let candidates = roster
    if (mode === 'name')
      candidates = roster.filter((person) =>
        person.name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLocaleLowerCase('es')
          .includes(
            value
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .toLocaleLowerCase('es')
          )
      )
    if (mode === 'id') candidates = roster.filter((person) => person.numericId === value)
    if (mode === 'qr') {
      const qrToken = parseCredentialQr(value)
      const identity = qrToken ? await findAthleteIdentity({ qrToken }) : null
      candidates = identity
        ? roster.filter((person) =>
            selected.some(
              (booking) =>
                booking.id === person.studentId &&
                profile(booking).id === identity.profileId &&
                profile(booking).type === identity.profileType
            )
          )
        : []
    }
    return NextResponse.json({ ...base, roster, candidates }, { headers })
  } catch {
    return NextResponse.json(
      { error: 'No pudimos cargar el pase de lista. Inténtalo de nuevo.' },
      { status: 500 }
    )
  }
}
export async function POST(request: Request) {
  try {
    const access = await requirePersonalCoach(request)
    if (access.response) return access.response
    const body = await request.json().catch(() => null)
    if (!body || typeof body.occurrenceId !== 'string')
      return NextResponse.json({ error: 'Revisa la clase.' }, { status: 400 })
    const bookings = await personalBookings(access.uid)
    let booking = bookings.find(
      (item) => item.id === body.studentId && classId(item) === body.occurrenceId
    )
    if (body.qrValue || body.numericId) {
      const qrToken = typeof body.qrValue === 'string' ? parseCredentialQr(body.qrValue) : null
      const identity = qrToken
        ? await findAthleteIdentity({ qrToken })
        : typeof body.numericId === 'string'
          ? await findAthleteIdentity({ numericId: body.numericId })
          : null
      booking = identity
        ? bookings.find(
            (item) =>
              classId(item) === body.occurrenceId &&
              profile(item).id === identity.profileId &&
              profile(item).type === identity.profileType
          )
        : undefined
    }
    if (!booking || booking.status !== 'confirmed')
      return NextResponse.json(
        { error: 'El atleta debe tener una inscripción confirmada en esta clase.' },
        { status: 409 }
      )
    const blocks = await adminDb
      .collection('coachScheduleBlocks')
      .where('coachId', '==', access.uid)
      .get()
    if (
      blocks.docs.some((doc) => {
        const block = doc.data()
        return (
          !block.schoolId &&
          block.date === booking.date &&
          (block.allDay ||
            (block.startTime <= booking.startTime && booking.startTime < block.endTime))
        )
      })
    )
      return NextResponse.json(
        { error: 'La clase está bloqueada.', code: 'blocked' },
        { status: 409 }
      )
    if (booking.attended) return NextResponse.json({ alreadyRecorded: true })
    const result = await updateBooking(
      new Request(new URL('/api/coach/agenda/bookings', request.url), {
        method: 'PATCH',
        headers: {
          authorization: request.headers.get('authorization') || '',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ id: booking.id, attended: true }),
      })
    )
    if (!result.ok) return result
    return NextResponse.json({ alreadyRecorded: false })
  } catch {
    return NextResponse.json(
      { error: 'No pudimos registrar la asistencia. Inténtalo de nuevo.' },
      { status: 500 }
    )
  }
}
