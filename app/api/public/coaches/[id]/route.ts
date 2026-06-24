import { NextResponse } from 'next/server'
import type { CoachPublic } from '@/firebase/coaches/coach.model'
import { publicNameFromUser } from '@/lib/public-name'
import { adminDb } from '@/lib/server/firebase-admin'
import {
  getPublicBlockedSlots,
  getPublicBookedSlots,
  getPublicOpenSlots,
} from '@/lib/server/public-coach'

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
    const [bookedSlots, openSlots, blockedSlots] = await Promise.all([
      getPublicBookedSlots(id),
      getPublicOpenSlots(id),
      getPublicBlockedSlots(id),
    ])

    return NextResponse.json({
      coach: { ...coach, id: coachSnap.id },
      name: publicNameFromUser(user),
      avatarUrl:
        typeof user?.photoURL === 'string'
          ? user.photoURL
          : typeof user?.photoUrl === 'string'
            ? user.photoUrl
            : null,
      bookedSlots,
      openSlots,
      blockedSlots,
    })
  } catch (error) {
    console.error('[PUBLIC_COACH_DETAIL]', error)
    return NextResponse.json({ coach: null }, { status: 500 })
  }
}
