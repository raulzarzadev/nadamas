import { expect, test } from '@playwright/test'
import type { SchoolMembership } from '../lib/school'
import { schoolClassCoachIds, schoolScheduleOwners } from '../lib/server/school-agenda'

function membership(
  id: string,
  role: SchoolMembership['role'],
  status: SchoolMembership['status'] = 'active'
): SchoolMembership {
  return {
    id,
    userId: id,
    schoolId: 'school-1',
    role,
    status,
    createdAt: 0,
    updatedAt: 0,
  }
}

test.describe('responsables de horarios escolares', () => {
  test('incluye al director junto a los coaches activos', () => {
    const owners = schoolScheduleOwners([
      membership('director-1', 'director'),
      membership('coach-1', 'teacher'),
      membership('coach-2', 'teacher'),
    ])

    expect(owners.map(({ userId }) => userId)).toEqual(['director-1', 'coach-1', 'coach-2'])
  })

  test('excluye los miembros pendientes y suspendidos', () => {
    const owners = schoolScheduleOwners([
      membership('director-1', 'director'),
      membership('coach-pending', 'teacher', 'pending'),
      membership('coach-suspended', 'teacher', 'suspended'),
    ])

    expect(owners.map(({ userId }) => userId)).toEqual(['director-1'])
  })

  test('muestra una clase en la fila de cada coach asignado, sin duplicar coaches', () => {
    const coaches = schoolClassCoachIds({
      assignedCoachIds: ['coach-1', 'coach-2', 'coach-1', 'suspended-coach'],
      allowedCoachIds: new Set(['coach-1', 'coach-2']),
    })

    expect(coaches).toEqual(['coach-1', 'coach-2'])
  })

  test('filtra la clase al coach elegido cuando se administra una sola agenda', () => {
    const coaches = schoolClassCoachIds({
      assignedCoachIds: ['coach-1', 'coach-2'],
      allowedCoachIds: new Set(['coach-1', 'coach-2']),
      targetCoachId: 'coach-2',
    })

    expect(coaches).toEqual(['coach-2'])
  })
})
