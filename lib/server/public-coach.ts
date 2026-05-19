import 'server-only'

import type { CoachPublic } from '@/firebase/coaches/coach.model'
import { publicNameFromUser } from '@/lib/public-name'
import { adminDb } from '@/lib/server/firebase-admin'

export async function getPublicCoachDetail(id: string) {
  const coachSnap = await adminDb.collection('coaches').doc(id).get()
  if (!coachSnap.exists) return null

  const userSnap = await adminDb.collection('users').doc(id).get()
  const user = userSnap.data()
  const coach = { ...(coachSnap.data() as CoachPublic), id: coachSnap.id }

  return {
    coach,
    name: publicNameFromUser(user),
  }
}
