import 'server-only'

import { publicNameFromUser } from '@/lib/public-name'
import { adminDb } from './firebase-admin'

export interface PublicAthleteDetail {
  uid: string
  name: string
  photoURL: string | null
  bio: string | null
}

/** Public athlete card data — only safe, user-set fields. Private profile data
 * (legal name, per-coach progress) is never exposed here. */
export async function getPublicAthleteDetail(uid: string): Promise<PublicAthleteDetail | null> {
  const snap = await adminDb.collection('users').doc(uid).get()
  if (!snap.exists) return null
  const user = snap.data() || {}
  const photoURL = typeof user.photoURL === 'string' ? user.photoURL : null
  const bio = typeof user.athleteBio === 'string' && user.athleteBio.trim() ? user.athleteBio : null
  return { uid, name: publicNameFromUser(user), photoURL, bio }
}
