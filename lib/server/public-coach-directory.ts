import 'server-only'

import type { CoachPublic } from '@/firebase/coaches/coach.model'
import { hasPublishedOfferingSchedules, resolveOfferings } from '@/lib/coach-offerings'
import { publicNameFromUser } from '@/lib/public-name'
import { adminDb } from './firebase-admin'

export interface PublicCoachDirectoryItem extends CoachPublic {
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

/** Public coach directory, verified + bookable coaches first. */
export async function getPublicCoachDirectory(): Promise<PublicCoachDirectoryItem[]> {
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

  return coaches.sort(sortCoachDirectory)
}

/** Public URL path of a coach profile: vanity slug when set, else the uid. */
export function publicCoachPath(coach: Pick<PublicCoachDirectoryItem, 'id' | 'slug'>) {
  return `/${coach.slug || coach.id}`
}
