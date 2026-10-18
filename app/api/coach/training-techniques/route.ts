import { NextResponse } from 'next/server'
import { reportServerError } from '@/lib/analytics/server'
import { adminDb } from '@/lib/server/firebase-admin'
import { getSchoolCaller } from '@/lib/server/school-access'

export const runtime = 'nodejs'

const MAX_ITEMS = 30
const KINDS = ['techniques', 'materials'] as const
type Kind = (typeof KINDS)[number]
const unauthorized = () =>
  NextResponse.json({ error: 'Tu sesión no está disponible.' }, { status: 401 })

// Custom techniques/materials a coach typed with "Otro", offered as chips in future series.
const preferences = (uid: string) => adminDb.collection('coachPreferences').doc(uid)
const strings = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

export async function GET(request: Request) {
  try {
    const caller = await getSchoolCaller(request)
    if (!caller) return unauthorized()
    const data = (await preferences(caller.uid).get()).data()
    return NextResponse.json(
      { techniques: strings(data?.techniques), materials: strings(data?.materials) },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch (error) {
    reportServerError('COACH_TECHNIQUES_READ', error, request)
    return NextResponse.json({ techniques: [], materials: [] }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const caller = await getSchoolCaller(request)
    if (!caller) return unauthorized()
    const body = (await request.json().catch(() => null)) as {
      kind?: unknown
      values?: unknown
    } | null
    const kind = KINDS.find((item) => item === body?.kind) as Kind | undefined
    const values = strings(body?.values)
      .map((item) => item.trim())
      .filter((item) => item && item.length <= 60)
      .slice(0, 10)
    if (!kind || !values.length)
      return NextResponse.json({ error: 'Revisa los datos e inténtalo de nuevo.' }, { status: 400 })
    const ref = preferences(caller.uid)
    await adminDb.runTransaction(async (transaction) => {
      const list = strings((await transaction.get(ref)).data()?.[kind])
      const known = new Set(list.map((item) => item.toLocaleLowerCase()))
      const added = values.filter((item) => {
        const key = item.toLocaleLowerCase()
        if (known.has(key)) return false
        known.add(key)
        return true
      })
      if (!added.length) return
      // Newest first; keep the list short.
      transaction.set(
        ref,
        { [kind]: [...added, ...list].slice(0, MAX_ITEMS), updatedAt: Date.now() },
        { merge: true }
      )
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    reportServerError('COACH_TECHNIQUES_SAVE', error, request)
    return NextResponse.json({ error: 'No pudimos guardar la preferencia.' }, { status: 500 })
  }
}
