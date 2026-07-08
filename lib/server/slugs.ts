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

function slugDocId(kind: SlugKind, slug: string) {
  return `${kind}:${slug}`
}

async function readSlugDoc(slug: string, kind: SlugKind) {
  const scopedSnap = await adminDb.collection('slugs').doc(slugDocId(kind, slug)).get()
  if (scopedSnap.exists) return scopedSnap

  const legacySnap = await adminDb.collection('slugs').doc(slug).get()
  if (legacySnap.exists && (legacySnap.data() as SlugDoc).kind === kind) return legacySnap

  return null
}

async function findUserUidBySlug(slug: string, kind: SlugKind) {
  const snap = await adminDb.collection('users').where(`slugs.${kind}`, '==', slug).limit(1).get()
  return snap.docs[0]?.id ?? null
}

/** Resolve a public path segment to its owner. Slugs are scoped by profile kind
 * so coach /zarza and athlete /atleta/zarza can coexist. */
export async function resolveSlug(
  param: string,
  kind: SlugKind
): Promise<{ uid: string; kind: SlugKind } | null> {
  const slug = normalizeSlug(param)
  const slugSnap = await readSlugDoc(slug, kind)
  if (slugSnap?.exists) {
    const data = slugSnap.data() as SlugDoc
    return { uid: data.uid, kind: data.kind }
  }

  const uidFromUserSlug = await findUserUidBySlug(slug, kind)
  if (uidFromUserSlug) return { uid: uidFromUserSlug, kind }

  if (kind === 'coach') {
    const coachSnap = await adminDb.collection('coaches').doc(param).get()
    if (coachSnap.exists) return { uid: param, kind: 'coach' }
  }

  return null
}

/** Find a free slug starting from `base`, appending -2, -3, … on collisions. */
export async function ensureUniqueSlug(
  base: string,
  ownerUid: string,
  kind: SlugKind
): Promise<string> {
  const root = slugify(base) || 'usuario'
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = attempt === 0 ? root : `${root}-${attempt + 1}`
    if (!isValidSlug(candidate)) continue
    const snap = await readSlugDoc(candidate, kind)
    if (!snap?.exists || (snap.data() as SlugDoc).uid === ownerUid) return candidate
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

  const ownerFromUserSlug = await findUserUidBySlug(slug, args.kind)
  if (ownerFromUserSlug && ownerFromUserSlug !== args.uid) return { ok: false, reason: 'taken' }

  const slugRef = adminDb.collection('slugs').doc(slugDocId(args.kind, slug))
  const legacySlugRef = adminDb.collection('slugs').doc(slug)
  const userRef = adminDb.collection('users').doc(args.uid)

  return adminDb.runTransaction(async (tx) => {
    const [existing, legacyExisting] = await Promise.all([tx.get(slugRef), tx.get(legacySlugRef)])
    const legacyData = legacyExisting.exists ? (legacyExisting.data() as SlugDoc) : null
    if (
      (existing.exists && (existing.data() as SlugDoc).uid !== args.uid) ||
      (legacyData?.kind === args.kind && legacyData.uid !== args.uid)
    ) {
      return { ok: false as const, reason: 'taken' as const }
    }

    const userSnap = await tx.get(userRef)
    const previous = (userSnap.data()?.slugs as { coach?: string; athlete?: string } | undefined)?.[
      args.kind
    ]
    const now = Date.now()

    if (previous && previous !== slug) {
      tx.delete(adminDb.collection('slugs').doc(slugDocId(args.kind, previous)))
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

/** Whether `requested` can be claimed by `uid` for this profile kind. */
export async function isSlugAvailable(
  requested: string,
  uid: string,
  kind: SlugKind
): Promise<boolean> {
  const slug = normalizeSlug(requested)
  if (!isValidSlug(slug)) return false
  const snap = await readSlugDoc(slug, kind)
  if (snap?.exists) return (snap.data() as SlugDoc).uid === uid
  const uidFromUserSlug = await findUserUidBySlug(slug, kind)
  return !uidFromUserSlug || uidFromUserSlug === uid
}
