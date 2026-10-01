import { expect, test } from '@playwright/test'
import type { School, SchoolMembership } from '../lib/school'
import { schoolsForWorkspace } from '../lib/school-workspace'

test('Escuela muestra solo dirección y Entrenador conserva las escuelas donde enseñas', () => {
  const access = (
    id: string,
    role: SchoolMembership['role'],
    status: SchoolMembership['status'] = 'active',
    roles?: SchoolMembership['roles']
  ) => ({
    school: { id } as School,
    membership: { role, roles, status } as SchoolMembership,
  })
  const memberships = [
    access('nanda', 'teacher'),
    access('own', 'director'),
    access('student-only', 'student'),
    access('inactive', 'director', 'inactive' as SchoolMembership['status']),
    access('dual-role', 'teacher', 'active', ['teacher', 'director']),
  ]
  expect(schoolsForWorkspace(memberships, false).map(({ school }) => school.id)).toEqual([
    'own',
    'dual-role',
  ])
  expect(schoolsForWorkspace(memberships, true).map(({ school }) => school.id)).toEqual([
    'nanda',
    'own',
    'dual-role',
  ])
  expect(schoolsForWorkspace([access('nanda', 'teacher')], false)).toEqual([])
})
