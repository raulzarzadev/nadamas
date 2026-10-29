import { NextResponse } from 'next/server'
import { reportServerError } from '@/lib/analytics/server'
import { validateOnboarding } from '@/lib/onboarding/model'
import { adminAuth, adminDb } from '@/lib/server/firebase-admin'
export const runtime = 'nodejs'
async function caller(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1]
  if (!token) return null
  try {
    return await adminAuth.verifyIdToken(token, true)
  } catch {
    return null
  }
}
export async function GET(request: Request) {
  const user = await caller(request)
  if (!user) return NextResponse.json({ error: 'Vuelve a iniciar sesión.' }, { status: 401 })
  try {
    const doc = await adminDb.collection('users').doc(user.uid).get()
    return NextResponse.json(
      { onboarding: doc.data()?.onboarding || null },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch (error) {
    reportServerError('ONBOARDING_READ', error, request)
    return NextResponse.json(
      { error: 'No pudimos cargar tu configuración. Inténtalo de nuevo.' },
      { status: 500 }
    )
  }
}
export async function POST(request: Request) {
  const user = await caller(request)
  if (!user) return NextResponse.json({ error: 'Vuelve a iniciar sesión.' }, { status: 401 })
  try {
    const input = validateOnboarding(await request.json().catch(() => null))
    if (!input)
      return NextResponse.json(
        { error: 'Elige al menos un perfil y cómo trabajas si eres entrenador.' },
        { status: 400 }
      )
    const ref = adminDb.collection('users').doc(user.uid)
    const onboarding = await adminDb.runTransaction(async (tx) => {
      const doc = await tx.get(ref)
      const data = doc.data() || {}
      const preferences = {
        ...input,
        version: 1 as const,
        completedAt: data.onboarding?.completedAt || Date.now(),
      }
      tx.set(
        ref,
        {
          onboarding: preferences,
          roles: {
            ...(data.roles || {}),
            athlete: true,
            coach:
              data.roles?.coach === true ||
              data.isCoach === true ||
              input.interests.includes('coach') ||
              input.interests.includes('coordinator'),
          },
          updatedAt: Date.now(),
        },
        { merge: true }
      )
      return preferences
    })
    return NextResponse.json({ onboarding })
  } catch (error) {
    reportServerError('ONBOARDING_SAVE', error, request)
    return NextResponse.json(
      { error: 'No pudimos guardar tu configuración. Inténtalo de nuevo.' },
      { status: 500 }
    )
  }
}
