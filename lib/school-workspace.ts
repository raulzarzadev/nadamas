import { type School, type SchoolMembership, schoolMembershipHasRole } from './school'

export function schoolsForWorkspace<T extends { school: School; membership: SchoolMembership }>(
  schools: T[],
  includePersonal: boolean
): T[] {
  return schools.filter(
    ({ membership }) =>
      membership.status === 'active' &&
      schoolMembershipHasRole(membership, includePersonal ? 'teacher' : 'director')
  )
}
