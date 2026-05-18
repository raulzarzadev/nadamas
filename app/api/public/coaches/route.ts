import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/server/firebase-admin'
import type { CoachPublic } from '@/firebase/coaches/coach.model'

interface PublicCoachDirectoryItem extends CoachPublic {
  id: string
  name: string
  avatarUrl?: string
}

function publicNameFromUser(user?: FirebaseFirestore.DocumentData) {
  const explicitName = user?.displayName || user?.name
  if (typeof explicitName === 'string' && explicitName.trim()) return explicitName.trim()

  const email = typeof user?.email === 'string' ? user.email : ''
  if (email) return email.split('@')[0]

  return 'Coach de natación'
}

export async function GET() {
  try {
    const coachesSnapshot = await adminDb.collection('coaches').get()
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
