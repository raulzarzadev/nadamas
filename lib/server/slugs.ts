import 'server-only'

import { isValidSlug, normalizeSlug, type SlugKind, slugify } from '@/lib/slug'
import { adminDb } from './firebase-admin'

interface SlugDoc {
  slug: string
  uid: string
  kind: SlugKind
  createdAt: number
  updatedAt: number
}

/** Resolve a public path segment to its owner. Tries the slug registry first,
 * then falls back to a raw coach uid (back-compat for old /<uid> links). */
export async function resolveSlug(param: string): Promise<{ uid: string; kind: SlugKind } | null> {
  const slug = normalizeSlug(param)
  const slugSnap = await adminDb.collection('slugs').doc(slug).get()
  if (slugSnap.exists) {
    const data = slugSnap.data() as SlugDoc
    return { uid: data.uid, kind: data.kind }
  }
  const coachSnap = await adminDb.collection('coaches').doc(param).get()
  if (coachSnap.exists) return { uid: param, kind: 'coach' }
  return null
}

/** Find a free slug starting from `base`, appending -2, -3, … on collisions. */
export async function ensureUniqueSlug(base: string, ownerUid: string): Promise<string> {
  const root = slugify(base) || 'usuario'
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = attempt === 0 ? root : `${root}-${attempt + 1}`
    if (!isValidSlug(candidate)) continue
    const snap = await adminDb.collection('slugs').doc(candidate).get()
    if (!snap.exists || (snap.data() as SlugDoc).uid === ownerUid) return candidate
  }
  // Extremely unlikely fallback: suffix with part of the uid.
  return `${root}-${ownerUid.slice(0, 6).toLowerCase()}`
}

export type SetSlugResult = { ok: true; slug: string } | { ok: false; reason: 'invalid' | 'taken' }

/** Claim `requested` for (uid, kind), freeing the user's previous slug for that
 * kind. Runs in a transaction so two users can't grab the same slug. */
export async function setSlug(args: {
  uid: string
  kind: SlugKind
  requested: string
}): Promise<SetSlugResult> {
  const slug = normalizeSlug(args.requested)
  if (!isValidSlug(slug)) return { ok: false, reason: 'invalid' }

  const slugRef = adminDb.collection('slugs').doc(slug)
  const userRef = adminDb.collection('users').doc(args.uid)

  return adminDb.runTransaction(async (tx) => {
    const existing = await tx.get(slugRef)
    if (existing.exists && (existing.data() as SlugDoc).uid !== args.uid) {
      return { ok: false as const, reason: 'taken' as const }
    }

    const userSnap = await tx.get(userRef)
    const previous = (userSnap.data()?.slugs as { coach?: string; athlete?: string } | undefined)?.[
      args.kind
    ]
    const now = Date.now()

    if (previous && previous !== slug) {
      tx.delete(adminDb.collection('slugs').doc(previous))
    }
    tx.set(slugRef, {
      slug,
      uid: args.uid,
      kind: args.kind,
      createdAt: existing.data()?.createdAt ?? now,
      updatedAt: now,
    } satisfies SlugDoc)
    tx.set(userRef, { slugs: { [args.kind]: slug }, updatedAt: now }, { merge: true })
    return { ok: true as const, slug }
  })
}

/** Whether `requested` can be claimed by `uid` (free or already theirs). */
export async function isSlugAvailable(requested: string, uid: string): Promise<boolean> {
  const slug = normalizeSlug(requested)
  if (!isValidSlug(slug)) return false
  const snap = await adminDb.collection('slugs').doc(slug).get()
  return !snap.exists || (snap.data() as SlugDoc).uid === uid
}
