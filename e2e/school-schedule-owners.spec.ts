import { expect, test } from '@playwright/test'
import type { SchoolClassOccurrence, SchoolMembership } from '../lib/school'
import {
  coalesceGroupClassOccurrences,
  schoolClassAgendaBooking,
  schoolClassCoachIds,
  schoolScheduleOwners,
} from '../lib/server/school-agenda'

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

  test('une alumnos de clases grupales duplicadas sin repetirlos', () => {
    const base: SchoolClassOccurrence = {
      id: 'class-1',
      seriesId: 'series-1',
      schoolId: 'school-1',
      title: 'Clase escolar',
      type: 'group',
      date: '2026-10-03',
      startTime: '18:00',
      endTime: '19:00',
      timezone: 'America/Mazatlan',
      teacherIds: ['coach-1'],
      studentIds: ['student-1'],
      location: '',
      locationUrl: '',
      status: 'pending',
      createdAt: 1,
      updatedAt: 1,
    }
    const classes = coalesceGroupClassOccurrences([
      base,
      { ...base, id: 'class-2', status: 'scheduled', studentIds: ['student-1', 'student-2'] },
      { ...base, id: 'class-3', teacherIds: ['coach-2'] },
    ])

    expect(classes).toHaveLength(2)
    expect(classes[0]?.id).toBe('class-2')
    expect(classes[0]?.studentIds).toEqual(['student-1', 'student-2'])
    expect(classes[1]?.id).toBe('class-3')

    const booking = schoolClassAgendaBooking({
      schoolId: 'school-1',
      occurrence: classes[0] as SchoolClassOccurrence,
      coachId: 'coach-1',
      coachName: 'Profe',
      studentNames: new Map([
        ['student-1', 'Chavalito Uno'],
        ['student-2', 'Dante Gutiérrez'],
      ]),
    })
    expect(booking.schoolClassStudents).toEqual([
      { id: 'student-1', name: 'Chavalito Uno', pending: true },
      { id: 'student-2', name: 'Dante Gutiérrez', pending: false },
    ])
  })
})
