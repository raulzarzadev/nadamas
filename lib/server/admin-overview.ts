import 'server-only'
import type { Query } from 'firebase-admin/firestore'
import type { AdminOverview, AdminPaymentProduct, AdminPerson } from '@/lib/admin-overview'
import { normalizeRoles } from '@/lib/roles'
import { type SchoolMembership, schoolMembershipHasExplicitRole } from '@/lib/school'
import { adminDb } from './firebase-admin'

// Projections deliberately exclude identity documents, birthdays, bank details
// and receipts. Bulk reads keep the dashboard independent of row count in HTTP
// requests; no per-school or per-person listener is mounted in the browser.
export async function getAdminOverview(): Promise<AdminOverview> {
  const count = async (query: Query) => (await query.count().get()).data().count
  const [users, schools, memberships, profiles, products, students, coaches, totals] =
    await Promise.all([
      adminDb
        .collection('users')
        .select('displayName', 'name', 'email', 'roles', 'isCoach', 'accountDisabled')
        .get(),
      adminDb.collection('schools').select('name', 'slug', 'directorId', 'isPublic').get(),
      adminDb
        .collection('schoolMemberships')
        .select('schoolId', 'userId', 'role', 'roles', 'status')
        .get(),
      adminDb.collection('additionalProfiles').select('name', 'ownerId').get(),
      adminDb
        .collection('paymentProducts')
        .select(
          'scope',
          'name',
          'mode',
          'priceCents',
          'active',
          'classes',
          'months',
          'expiryDays',
          'perDay',
          'perWeek',
          'perPeriod'
        )
        .get(),
      adminDb
        .collection('schoolStudents')
        .select('schoolId', 'name', 'status', 'studentUserId', 'additionalProfileId')
        .get(),
      adminDb.collection('coaches').select().get(),
      Promise.all([
        count(adminDb.collection('bookings')),
        count(adminDb.collection('schoolClassOccurrences')),
        count(adminDb.collection('schoolClassRequests').where('status', '==', 'pending')),
        count(adminDb.collection('paymentOrders').where('status', '==', 'pending')),
        count(adminDb.collection('paymentOrders').where('status', '==', 'approved')),
        count(adminDb.collection('paymentOrders').where('status', '==', 'rejected')),
      ]),
    ])

  const text = (value: unknown) => (typeof value === 'string' ? value : '')
  const userNames = new Map(
    users.docs.map((doc) => [
      doc.id,
      text(doc.data().displayName) ||
        text(doc.data().name) ||
        text(doc.data().email) ||
        'Usuario sin nombre',
    ])
  )
  const schoolNames = new Map(
    schools.docs.map((doc) => [doc.id, text(doc.data().name) || 'Escuela sin nombre'])
  )
  const activeMembers = memberships.docs
    .map((doc) => ({ ...doc.data(), id: doc.id }) as SchoolMembership)
    .filter(
      (member) =>
        member.status === 'active' &&
        schoolNames.has(member.schoolId) &&
        userNames.has(member.userId)
    )
  const coordinatorIds = new Set<string>()
  const teacherIds = new Set<string>()
  const personSchools = new Map<string, Set<string>>()
  const schoolPeople = new Map<string, { coordinators: Set<string>; coaches: Set<string> }>()
  for (const school of schools.docs)
    schoolPeople.set(school.id, { coordinators: new Set(), coaches: new Set() })
  for (const member of activeMembers) {
    if (!personSchools.has(member.userId)) personSchools.set(member.userId, new Set())
    personSchools.get(member.userId)?.add(member.schoolId)
    if (schoolMembershipHasExplicitRole(member, 'director')) {
      coordinatorIds.add(member.userId)
      schoolPeople.get(member.schoolId)?.coordinators.add(member.userId)
    }
    if (schoolMembershipHasExplicitRole(member, 'teacher')) {
      teacherIds.add(member.userId)
      schoolPeople.get(member.schoolId)?.coaches.add(member.userId)
    }
  }
  // Legacy owners without a membership remain visible. A suspended/pending
  // membership must not be promoted to active by the school owner field.
  const membershipKeys = new Set(
    memberships.docs.map((doc) => `${doc.data().schoolId}|${doc.data().userId}`)
  )
  for (const school of schools.docs) {
    const directorId = text(school.data().directorId)
    if (userNames.has(directorId) && !membershipKeys.has(`${school.id}|${directorId}`)) {
      coordinatorIds.add(directorId)
      schoolPeople.get(school.id)?.coordinators.add(directorId)
      if (!personSchools.has(directorId)) personSchools.set(directorId, new Set())
      personSchools.get(directorId)?.add(school.id)
    }
  }

  const people: AdminPerson[] = users.docs
    .map((doc) => {
      const user = doc.data(),
        roles = normalizeRoles(user)
      const relatedSchools = personSchools.get(doc.id) || new Set<string>()
      return {
        id: doc.id,
        name: userNames.get(doc.id) || 'Usuario sin nombre',
        email: text(user.email),
        disabled: user.accountDisabled === true,
        roles: [
          ...(coordinatorIds.has(doc.id) ? ['coordinator' as const] : []),
          ...(roles.coach || teacherIds.has(doc.id) ? ['coach' as const] : []),
          'athlete' as const,
          ...(roles.admin ? ['admin' as const] : []),
        ],
        schools: [...relatedSchools].map((id) => ({
          id,
          name: schoolNames.get(id) || 'Escuela sin nombre',
        })),
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))

  const paymentProducts = products.docs
    .map((doc): AdminPaymentProduct => {
      const product = doc.data(),
        scope = text(product.scope)
      const kind = scope.startsWith('school:')
        ? 'school'
        : scope.startsWith('coach:')
          ? 'coach'
          : 'unknown'
      const ownerId = scope.slice(scope.indexOf(':') + 1)
      const integer = (value: unknown) =>
        typeof value === 'number' && Number.isFinite(value) ? value : 0
      const limit = (value: unknown) =>
        typeof value === 'number' && Number.isFinite(value) ? value : null
      return {
        id: doc.id,
        scope,
        scopeKind: kind,
        scopeName:
          kind === 'school'
            ? schoolNames.get(ownerId) || 'Escuela no disponible'
            : kind === 'coach'
              ? userNames.get(ownerId) || 'Entrenador no disponible'
              : 'Sin asignar',
        name: text(product.name) || 'Plan sin nombre',
        mode: product.mode === 'period' ? 'period' : 'classes',
        active: product.active === true,
        priceCents: integer(product.priceCents),
        classes: integer(product.classes),
        months: integer(product.months),
        expiryDays: limit(product.expiryDays),
        perDay: limit(product.perDay),
        perWeek: limit(product.perWeek),
        perPeriod: limit(product.perPeriod),
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))

  const schoolStudents = new Map<string, Set<string>>()
  const roster = new Map<string, Map<string, { id: string; name: string; userId: string }>>()
  const profileNames = new Map(profiles.docs.map((doc) => [doc.id, text(doc.data().name)]))
  const enrolledAccounts = new Set(
    students.docs
      .filter((doc) => text(doc.data().studentUserId))
      .map((doc) => `${doc.data().schoolId}|${doc.data().studentUserId}`)
  )
  for (const doc of students.docs) {
    const student = doc.data()
    if (student.status !== 'active') continue
    const schoolId = text(student.schoolId)
    const profileId = text(student.additionalProfileId)
    const userId = text(student.studentUserId)
    const key = profileId
      ? `additional:${profileId}`
      : userId
        ? `user:${userId}`
        : `record:${doc.id}`
    if (!roster.has(schoolId)) roster.set(schoolId, new Map())
    roster.get(schoolId)?.set(key, {
      id: key,
      name:
        text(student.name) ||
        profileNames.get(profileId) ||
        userNames.get(userId) ||
        'Alumno sin nombre',
      userId: profileId ? '' : userId,
    })
    if (!schoolStudents.has(schoolId)) schoolStudents.set(schoolId, new Set())
    schoolStudents
      .get(schoolId)
      ?.add(
        text(student.additionalProfileId)
          ? `additional:${student.additionalProfileId}`
          : text(student.studentUserId)
            ? `user:${student.studentUserId}`
            : `record:${doc.id}`
      )
  }
  for (const member of activeMembers)
    if (
      !enrolledAccounts.has(`${member.schoolId}|${member.userId}`) &&
      (schoolMembershipHasExplicitRole(member, 'student') ||
        (member.role as string) === 'guardian' ||
        (member.roles as string[] | undefined)?.includes('guardian'))
    ) {
      if (!schoolStudents.has(member.schoolId)) schoolStudents.set(member.schoolId, new Set())
      schoolStudents.get(member.schoolId)?.add(`user:${member.userId}`)
      if (!roster.has(member.schoolId)) roster.set(member.schoolId, new Map())
      roster.get(member.schoolId)?.set(`user:${member.userId}`, {
        id: `user:${member.userId}`,
        name: userNames.get(member.userId) || 'Alumno sin nombre',
        userId: member.userId,
      })
    }

  // Match the verification queue's private status without retrieving documents
  // or contact details. getAll batches replace one listener/request per coach.
  let pendingReviews = 0
  for (let offset = 0; offset < coaches.docs.length; offset += 300) {
    const refs = coaches.docs
      .slice(offset, offset + 300)
      .map((doc) => doc.ref.collection('private').doc('profile'))
    const privateStatuses = await adminDb.getAll(...refs, {
      fieldMask: ['identityVerification.status'],
    })
    pendingReviews += privateStatuses.filter(
      (doc) => doc.data()?.identityVerification?.status === 'pending'
    ).length
  }
  return {
    updatedAt: Date.now(),
    counts: {
      users: people.length,
      schools: schools.size,
      coordinators: coordinatorIds.size,
      coaches: people.filter((person) => person.roles.includes('coach')).length,
      athletes: people.length,
      additionalProfiles: profiles.size,
      coachProfiles: coaches.size,
      activeProducts: paymentProducts.filter((product) => product.active).length,
      products: products.size,
      pendingReviews,
      privateBookings: totals[0],
      schoolClasses: totals[1],
      pendingClassRequests: totals[2],
      pendingPayments: totals[3],
      approvedPayments: totals[4],
      rejectedPayments: totals[5],
    },
    people,
    schools: schools.docs
      .map((doc) => ({
        id: doc.id,
        name: schoolNames.get(doc.id) || 'Escuela sin nombre',
        slug: text(doc.data().slug),
        isPublic: doc.data().isPublic === true,
        coordinators: [...(schoolPeople.get(doc.id)?.coordinators || [])].map((id) => ({
          id,
          name: userNames.get(id) || 'Usuario sin nombre',
        })),
        teachers: [...(schoolPeople.get(doc.id)?.coaches || [])].map((id) => ({
          id,
          name: userNames.get(id) || 'Entrenador sin nombre',
        })),
        roster: [...(roster.get(doc.id)?.values() || [])].sort((a, b) =>
          a.name.localeCompare(b.name, 'es')
        ),
        coaches: schoolPeople.get(doc.id)?.coaches.size || 0,
        students: schoolStudents.get(doc.id)?.size || 0,
        products: paymentProducts.filter((product) => product.scope === `school:${doc.id}`).length,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es')),
    profiles: profiles.docs
      .map((doc) => ({
        id: doc.id,
        name: text(doc.data().name) || 'Perfil sin nombre',
        ownerId: text(doc.data().ownerId),
        ownerName: userNames.get(text(doc.data().ownerId)) || 'Cuenta no disponible',
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es')),
    products: paymentProducts,
  }
}
