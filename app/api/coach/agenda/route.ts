import { NextResponse } from 'next/server'
import type { CoachPublic } from '@/firebase/coaches/coach.model'
import {
  buildAvailableSlots,
  type CoachScheduleBlock,
  monthRange,
  normalizeScheduleBlockInput,
  type ScheduleBlockInput,
} from '@/lib/coach-agenda'
import type { Booking } from '@/lib/coach-booking'
import { resolveOfferings } from '@/lib/coach-offerings'
import { adminAuth, adminDb } from '@/lib/server/firebase-admin'

export const runtime = 'nodejs'

function getBearerToken(request: Request) {
  const match = (request.headers.get('authorization') || '').match(/^Bearer (.+)$/i)
  return match?.[1] || null
}

async function verifyCoach(request: Request) {
  const token = getBearerToken(request)
  if (!token) return { error: NextResponse.json({ error: 'No autenticado.' }, { status: 401 }) }

  const caller = await adminAuth.verifyIdToken(token)
  const callerDoc = await adminDb.collection('users').doc(caller.uid).get()
  const isAdmin = callerDoc.data()?.roles?.admin === true
  if (callerDoc.data()?.roles?.coach !== true && !isAdmin) {
    return { error: NextResponse.json({ error: 'No autorizado.' }, { status: 403 }) }
  }

  return { caller, isAdmin }
}

// Admins may target another coach via `coachId`; everyone else acts on their own uid.
function resolveCoachId(
  verification: { caller: { uid: string }; isAdmin: boolean },
  target: string | null
) {
  return verification.isAdmin && target ? target : verification.caller.uid
}

export async function GET(request: Request) {
  const verification = await verifyCoach(request)
  if (verification.error) return verification.error

  const url = new URL(request.url)
  const coachId = resolveCoachId(verification, url.searchParams.get('coachId'))
  const range = monthRange(url.searchParams.get('month'))
  const [coachDoc, bookingsSnapshot, blocksSnapshot] = await Promise.all([
    adminDb.collection('coaches').doc(coachId).get(),
    adminDb.collection('bookings').where('coachId', '==', coachId).get(),
    adminDb.collection('coachScheduleBlocks').where('coachId', '==', coachId).get(),
  ])

  const coach = { id: coachDoc.id, ...coachDoc.data() } as CoachPublic
  const bookings = bookingsSnapshot.docs
    .map((doc) => doc.data() as Booking)
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))
  const blocks = blocksSnapshot.docs
    .map((doc) => doc.data() as CoachScheduleBlock)
    .sort((a, b) =>
      `${a.date} ${a.startTime || ''}`.localeCompare(`${b.date} ${b.startTime || ''}`)
    )
  const offerings = resolveOfferings(coach)

  const availableSlots = buildAvailableSlots({
    coachId,
    offerings,
    bookings,
    blocks,
    startDate: range.start,
    endDate: range.end,
  })

  return NextResponse.json({ bookings, blocks, availableSlots, offerings })
}

export async function POST(request: Request) {
  const verification = await verifyCoach(request)
  if (verification.error) return verification.error

  const body = (await request.json()) as ScheduleBlockInput & { coachId?: string }
  const coachId = resolveCoachId(verification, body.coachId ?? null)
  const input = normalizeScheduleBlockInput(body)
  if (!input) {
    return NextResponse.json({ error: 'Datos de bloqueo inválidos.' }, { status: 400 })
  }

  const now = Date.now()
  const ref = adminDb.collection('coachScheduleBlocks').doc()
  const block: CoachScheduleBlock = {
    id: ref.id,
    coachId,
    createdAt: now,
    updatedAt: now,
    ...input,
  }

  await ref.set(block)
  return NextResponse.json({ block })
}

export async function DELETE(request: Request) {
  const verification = await verifyCoach(request)
  if (verification.error) return verification.error

  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Bloqueo inválido.' }, { status: 400 })

  const coachId = resolveCoachId(verification, url.searchParams.get('coachId'))
  const ref = adminDb.collection('coachScheduleBlocks').doc(id)
  const current = await ref.get()
  if (!current.exists || current.data()?.coachId !== coachId) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }

  await ref.delete()
  return NextResponse.json({ ok: true })
}
