import { NextResponse } from 'next/server'
import type { CoachPublic } from '@/firebase/coaches/coach.model'
import { hasPublishedOfferingSchedules, resolveOfferings } from '@/lib/coach-offerings'
import { publicNameFromUser } from '@/lib/public-name'
import { adminDb } from '@/lib/server/firebase-admin'

interface PublicCoachDirectoryItem extends CoachPublic {
  id: string
  name: string
  avatarUrl?: string
  slug?: string
}

function coachDirectoryPriority(coach: PublicCoachDirectoryItem) {
  const verified = coach.verification?.status === 'verified'
  const hasSchedules = hasPublishedOfferingSchedules(resolveOfferings(coach))

  if (verified && hasSchedules) return 0
  if (verified) return 1
  if (hasSchedules) return 2
  return 3
}

function sortCoachDirectory(a: PublicCoachDirectoryItem, b: PublicCoachDirectoryItem) {
  return coachDirectoryPriority(a) - coachDirectoryPriority(b) || a.name.localeCompare(b.name, 'es')
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
          slug: typeof user?.slugs?.coach === 'string' ? user.slugs.coach : undefined,
          avatarUrl:
            typeof user?.photoURL === 'string'
              ? user.photoURL
              : typeof user?.photoUrl === 'string'
                ? user.photoUrl
                : undefined,
        } satisfies PublicCoachDirectoryItem
      })
    )

    return NextResponse.json({ coaches: coaches.sort(sortCoachDirectory) })
  } catch (error) {
    console.error('[PUBLIC_COACH_DIRECTORY]', error)
    return NextResponse.json({ coaches: [] }, { status: 500 })
  }
}
