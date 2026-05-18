import { NextResponse } from 'next/server'
import type { CoachPublic } from '@/firebase/coaches/coach.model'
import { adminDb } from '@/lib/server/firebase-admin'

function publicNameFromUser(user?: FirebaseFirestore.DocumentData) {
  const explicitName = user?.displayName || user?.name
  if (typeof explicitName === 'string' && explicitName.trim()) {
    return explicitName.trim()
  }

  const email = typeof user?.email === 'string' ? user.email : ''
  if (email) return email.split('@')[0]

  return 'Coach de natación'
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const coachSnap = await adminDb.collection('coaches').doc(id).get()
    if (!coachSnap.exists) {
      return NextResponse.json({ coach: null }, { status: 404 })
    }

    const userSnap = await adminDb.collection('users').doc(id).get()
    const user = userSnap.data()
    const coach = coachSnap.data() as CoachPublic

    return NextResponse.json({
      coach: { ...coach, id: coachSnap.id },
      name: publicNameFromUser(user),
      avatarUrl:
        typeof user?.photoURL === 'string'
          ? user.photoURL
          : typeof user?.photoUrl === 'string'
            ? user.photoUrl
            : null,
    })
  } catch (error) {
    console.error('[PUBLIC_COACH_DETAIL]', error)
    return NextResponse.json({ coach: null }, { status: 500 })
  }
}
