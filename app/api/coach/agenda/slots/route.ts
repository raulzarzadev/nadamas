import { NextResponse } from 'next/server'
import type { CoachPublic } from '@/firebase/coaches/coach.model'
import { type CoachOpenSlot, normalizeOpenSlotInput } from '@/lib/coach-agenda'
import { offeringPlaceLabel, offeringPriceCents, resolveOfferings } from '@/lib/coach-offerings'
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
  if (callerDoc.data()?.roles?.coach !== true && callerDoc.data()?.roles?.admin !== true) {
    return { error: NextResponse.json({ error: 'No autorizado.' }, { status: 403 }) }
  }

  return { caller }
}

export async function POST(request: Request) {
  const verification = await verifyCoach(request)
  if (verification.error) return verification.error

  const coachId = verification.caller.uid
  const combos = normalizeOpenSlotInput(
    (await request.json()) as { dates?: unknown; times?: unknown }
  )
  if (!combos) {
    return NextResponse.json({ error: 'Selecciona al menos un día y una hora.' }, { status: 400 })
  }

  const [existingSnapshot, coachDoc] = await Promise.all([
    adminDb.collection('coachOpenSlots').where('coachId', '==', coachId).get(),
    adminDb.collection('coaches').doc(coachId).get(),
  ])

  // Skip duplicates of already-published hours.
  const existing = new Set(
    existingSnapshot.docs.map((doc) => `${doc.data().date}::${doc.data().startTime}`)
  )

  // Inherit price + location defaults from the coach's first offering so open
  // hours aren't "precio por definir".
  const coach = { ...(coachDoc.data() as CoachPublic), id: coachDoc.id }
  const defaultOffering = resolveOfferings(coach)[0]
  const defaultLocation = defaultOffering ? offeringPlaceLabel(defaultOffering) : ''
  const defaultPriceCents = defaultOffering ? offeringPriceCents(defaultOffering) : null

  const now = Date.now()
  const created: CoachOpenSlot[] = []
  await Promise.all(
    combos
      .filter((combo) => !existing.has(`${combo.date}::${combo.startTime}`))
      .map((combo) => {
        const ref = adminDb.collection('coachOpenSlots').doc()
        const slot: CoachOpenSlot = {
          id: ref.id,
          coachId,
          date: combo.date,
          startTime: combo.startTime,
          endTime: combo.endTime,
          locationName: defaultLocation || 'Horario abierto',
          priceCents: defaultPriceCents,
          createdAt: now,
          updatedAt: now,
        }
        created.push(slot)
        return ref.set(slot)
      })
  )

  return NextResponse.json({ created })
}

export async function DELETE(request: Request) {
  const verification = await verifyCoach(request)
  if (verification.error) return verification.error

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Horario inválido.' }, { status: 400 })

  const ref = adminDb.collection('coachOpenSlots').doc(id)
  const current = await ref.get()
  if (!current.exists || current.data()?.coachId !== verification.caller.uid) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }

  await ref.delete()
  return NextResponse.json({ ok: true })
}
