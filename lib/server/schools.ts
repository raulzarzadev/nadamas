import { normalizeSchoolMembership } from '@/lib/school'
import 'server-only'

import type { DocumentSnapshot } from 'firebase-admin/firestore'
import {
  DEFAULT_SCHOOL_PALETTE,
  DEFAULT_SCHOOL_TERMINOLOGY,
  isSchoolPalette,
  isValidSchoolTerminology,
  normalizeSchoolTerminology,
  type School,
  type SchoolMembership,
  type SchoolPalette,
  type SchoolRole,
  type SchoolTerminologyConfig,
} from '@/lib/school'
import { isValidSlug, normalizeSlug } from '@/lib/slug'
import { adminDb } from './firebase-admin'

interface SchoolInput {
  name: string
  slug: string
  description: string
  logoUrl?: string | null
  palette?: SchoolPalette
  showCoaches?: boolean
  showCoachesSchedules?: boolean
  showStudents?: boolean
  terminology?: SchoolTerminologyConfig
  timezone: string
}

function isValidTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format()
    return true
  } catch {
    return false
  }
}

function isAllowedLogoUrl(value: string) {
  try {
    const url = new URL(value)
    const isStorageEmulator =
      process.env.NODE_ENV !== 'production' &&
      (url.hostname === '127.0.0.1' || url.hostname === 'localhost') &&
      url.port === '9199'
    return (
      (url.protocol === 'https:' &&
        (url.hostname === 'firebasestorage.googleapis.com' ||
          url.hostname.endsWith('.firebasestorage.app'))) ||
      Boolean(isStorageEmulator && url.protocol === 'http:')
    )
  } catch {
    return false
  }
}

export function validateSchoolInput(
  input: Partial<Omit<SchoolInput, 'palette' | 'terminology'>> & {
    palette?: unknown
    terminology?: unknown
  }
) {
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  const slug = normalizeSlug(typeof input.slug === 'string' ? input.slug : '')
  const description = typeof input.description === 'string' ? input.description.trim() : ''
  const timezone = typeof input.timezone === 'string' ? input.timezone.trim() : ''
  const logoUrl = typeof input.logoUrl === 'string' ? input.logoUrl.trim() : null
  const rawPalette = (input as Partial<Record<'palette', unknown>>).palette

  if (name.length < 2 || name.length > 100) return { ok: false as const, reason: 'name' as const }
  if (!isValidSlug(slug)) return { ok: false as const, reason: 'slug' as const }
  if (description.length > 1000) return { ok: false as const, reason: 'description' as const }
  if (!isValidTimezone(timezone)) return { ok: false as const, reason: 'timezone' as const }
  if (logoUrl && !isAllowedLogoUrl(logoUrl)) return { ok: false as const, reason: 'logo' as const }
  if (rawPalette !== undefined && !isSchoolPalette(rawPalette)) {
    return { ok: false as const, reason: 'palette' as const }
  }
  if (input.terminology !== undefined && !isValidSchoolTerminology(input.terminology)) {
    return { ok: false as const, reason: 'terminology' as const }
  }

  return {
    ok: true as const,
    value: {
      name,
      slug,
      description,
      timezone,
      logoUrl,
      palette: isSchoolPalette(rawPalette) ? rawPalette : DEFAULT_SCHOOL_PALETTE,
      showCoaches: true,
      showCoachesSchedules: true,
      showStudents: false,
      terminology: normalizeSchoolTerminology(input.terminology ?? DEFAULT_SCHOOL_TERMINOLOGY),
    },
  }
}

function schoolFromSnapshot(snapshot: DocumentSnapshot): School | null {
  if (!snapshot.exists) return null
  return { id: snapshot.id, ...(snapshot.data() as Omit<School, 'id'>) }
}

export async function getSchoolById(schoolId: string) {
  return schoolFromSnapshot(await adminDb.collection('schools').doc(schoolId).get())
}

export async function getSchoolBySlug(slugInput: string) {
  const slug = normalizeSlug(slugInput)
  if (!slug) return null

  const slugSnapshot = await adminDb.collection('schoolSlugs').doc(slug).get()
  if (slugSnapshot.exists) {
    const schoolId = slugSnapshot.data()?.schoolId
    if (typeof schoolId === 'string') return getSchoolById(schoolId)
  }

  const legacySnapshot = await adminDb
    .collection('schools')
    .where('slug', '==', slug)
    .limit(1)
    .get()
  return legacySnapshot.empty ? null : schoolFromSnapshot(legacySnapshot.docs[0])
}

export async function getSchoolsForUser(userId: string) {
  const memberships = await adminDb
    .collection('schoolMemberships')
    .where('userId', '==', userId)
    .get()

  const result = await Promise.all(
    memberships.docs.map(async (membershipSnapshot) => {
      const membership = normalizeSchoolMembership({
        id: membershipSnapshot.id,
        ...(membershipSnapshot.data() as Omit<SchoolMembership, 'id'>),
      })
      const school = await getSchoolById(membership.schoolId)
      return school ? { school, membership } : null
    })
  )

  return result.filter(
    (item): item is { school: School; membership: SchoolMembership } => item !== null
  )
}

export async function getOwnedSchool(userId: string) {
  const userSnapshot = await adminDb.collection('users').doc(userId).get()
  const createdSchoolId = userSnapshot.data()?.createdSchoolId
  if (typeof createdSchoolId !== 'string') return null
  return getSchoolById(createdSchoolId)
}

export async function updateSchoolProfile(
  schoolId: string,
  input: Pick<
    School,
    | 'name'
    | 'description'
    | 'timezone'
    | 'slug'
    | 'logoUrl'
    | 'palette'
    | 'showCoaches'
    | 'showCoachesSchedules'
    | 'showStudents'
    | 'terminology'
  >
) {
  const schoolRef = adminDb.collection('schools').doc(schoolId)
  const currentSnapshot = await schoolRef.get()
  const current = schoolFromSnapshot(currentSnapshot)
  if (!current) return null

  const now = Date.now()
  const schoolData = {
    name: input.name,
    slug: input.slug,
    description: input.description,
    timezone: input.timezone,
    logoUrl: input.logoUrl || null,
    palette: input.palette || DEFAULT_SCHOOL_PALETTE,
    showCoaches: true,
    showCoachesSchedules: true,
    showStudents: false,
    terminology: normalizeSchoolTerminology(input.terminology),
    updatedAt: now,
  }

  if (current.slug === input.slug) {
    await schoolRef.update(schoolData)
  } else {
    const nextSlugRef = adminDb.collection('schoolSlugs').doc(input.slug)
    const currentSlugRef = adminDb.collection('schoolSlugs').doc(current.slug)
    await adminDb.runTransaction(async (transaction) => {
      const nextSlugSnapshot = await transaction.get(nextSlugRef)
      if (nextSlugSnapshot.exists && nextSlugSnapshot.data()?.schoolId !== schoolId) {
        throw new Error('SCHOOL_SLUG_TAKEN')
      }
      transaction.update(schoolRef, schoolData)
      transaction.delete(currentSlugRef)
      transaction.set(nextSlugRef, { schoolId, slug: input.slug, updatedAt: now })
    })
  }
  return getSchoolById(schoolId)
}

export async function createSchool(userId: string, input: SchoolInput) {
  const now = Date.now()
  const schoolRef = adminDb.collection('schools').doc()
  const slugRef = adminDb.collection('schoolSlugs').doc(input.slug)
  const userRef = adminDb.collection('users').doc(userId)
  const membershipRef = adminDb.collection('schoolMemberships').doc(`${schoolRef.id}_${userId}`)

  await adminDb.runTransaction(async (transaction) => {
    const [userSnapshot, slugSnapshot] = await Promise.all([
      transaction.get(userRef),
      transaction.get(slugRef),
    ])

    if (userSnapshot.data()?.createdSchoolId) throw new Error('USER_ALREADY_OWNS_SCHOOL')
    if (slugSnapshot.exists) throw new Error('SCHOOL_SLUG_TAKEN')

    transaction.set(schoolRef, {
      name: input.name,
      slug: input.slug,
      description: input.description,
      logoUrl: input.logoUrl || null,
      palette: input.palette || DEFAULT_SCHOOL_PALETTE,
      showCoaches: true,
      showCoachesSchedules: true,
      showStudents: false,
      terminology: normalizeSchoolTerminology(input.terminology),
      timezone: input.timezone,
      createdBy: userId,
      directorId: userId,
      isPublic: true,
      bookingMode: 'request',
      createdAt: now,
      updatedAt: now,
    } satisfies Omit<School, 'id'>)

    transaction.set(slugRef, {
      schoolId: schoolRef.id,
      slug: input.slug,
      createdAt: now,
    })

    transaction.set(membershipRef, {
      schoolId: schoolRef.id,
      userId,
      role: 'director' satisfies SchoolRole,
      roles: ['director'] satisfies SchoolRole[],
      status: 'active',
      createdAt: now,
      updatedAt: now,
    } satisfies Omit<SchoolMembership, 'id'>)

    transaction.set(userRef, { createdSchoolId: schoolRef.id, updatedAt: now }, { merge: true })
  })

  return getSchoolById(schoolRef.id)
}
