import { NextResponse } from 'next/server'
import type { CoachPublic } from '@/firebase/coaches/coach.model'
import { publicNameFromUser } from '@/lib/public-name'
import { adminDb } from '@/lib/server/firebase-admin'

interface PublicCoachDirectoryItem extends CoachPublic {
  id: string
  name: string
  avatarUrl?: string
}

export async function GET() {
  try {
    const coachesSnapshot = await adminDb
      .collection('coaches')
      .where('publicProfileVisible', '==', true)
      .get()
    const coaches = await Promise.all(
      coachesSnapshot.docs.map(async (doc) => {
        const coach = doc.data() as CoachPublic
        const userSnap = await adminDb.collection('users').doc(doc.id).get()
        const user = userSnap.data()

        return {
          ...coach,
          id: doc.id,
          name: publicNameFromUser(user),
          avatarUrl:
            typeof user?.photoURL === 'string'
              ? user.photoURL
              : typeof user?.photoUrl === 'string'
                ? user.photoUrl
                : undefined,
        } satisfies PublicCoachDirectoryItem
      })
    )

    return NextResponse.json({ coaches })
  } catch (error) {
    console.error('[PUBLIC_COACH_DIRECTORY]', error)
    return NextResponse.json({ coaches: [] }, { status: 500 })
  }
}
