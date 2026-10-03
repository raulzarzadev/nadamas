import type { Booking } from '@/lib/coach-booking'
import { WEEKDAY_LABELS } from '@/lib/coach-offerings'
import {
  type SchoolClassOccurrence,
  type SchoolMembership,
  schoolMembershipHasExplicitRole,
} from '@/lib/school'

export function schoolScheduleOwners(memberships: readonly SchoolMembership[]) {
  return memberships.filter(
    (membership) =>
      membership.status === 'active' &&
      (schoolMembershipHasExplicitRole(membership, 'teacher') ||
        schoolMembershipHasExplicitRole(membership, 'director'))
  )
}

export function schoolClassCoachIds({
  assignedCoachIds,
  allowedCoachIds,
  targetCoachId,
}: {
  assignedCoachIds: readonly unknown[]
  allowedCoachIds: ReadonlySet<string>
  targetCoachId?: string | null
}) {
  return [
    ...new Set(
      assignedCoachIds.filter(
        (coachId): coachId is string =>
          typeof coachId === 'string' &&
          allowedCoachIds.has(coachId) &&
          (!targetCoachId || coachId === targetCoachId)
      )
    ),
  ]
}

export function schoolClassAgendaBooking(args: {
  schoolId: string
  occurrence: SchoolClassOccurrence
  coachId: string
  coachName: string | null
  studentNames?: ReadonlyMap<string, string>
}): Booking {
  const { occurrence } = args
  const studentIds = Array.isArray(occurrence.studentIds)
    ? occurrence.studentIds.filter((id): id is string => typeof id === 'string')
    : []
  return {
    id: `school-class-${occurrence.id}-${args.coachId}`,
    schoolId: args.schoolId,
    schoolClassId: occurrence.id,
    schoolClassStudentIds: studentIds,
    schoolClassTitle: occurrence.title || 'Clase escolar',
    schoolClassStudentCount: studentIds.length,
    coachId: args.coachId,
    coachName: args.coachName,
    athleteId: '',
    athleteName: args.studentNames
      ? studentIds.map((id) => args.studentNames?.get(id) || 'Alumno').join(', ') || 'Clase escolar'
      : 'Clase escolar',
    athleteEmail: null,
    date: occurrence.date,
    startTime: occurrence.startTime,
    endTime: occurrence.endTime,
    offeringId: `school-class:${occurrence.seriesId || occurrence.id}`,
    scheduleId: `school-class:${occurrence.id}`,
    locationName: occurrence.location || '',
    mode: 'fixed',
    groupType: occurrence.type === 'group' ? 'grupal' : 'particular',
    days: [],
    price: null,
    priceCents: null,
    currency: 'MXN',
    unit: 'clase',
    status: occurrence.status === 'scheduled' ? 'confirmed' : occurrence.status,
    source: 'school-class',
    createdAt: occurrence.createdAt || 0,
    updatedAt: occurrence.updatedAt || 0,
    classFull: occurrence.classFull === true,
  }
}

export function legacySchoolOfferings(raw: unknown) {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item, index) => {
    if (!item || typeof item !== 'object') return []
    const slot = item as Record<string, unknown>
    const day = typeof slot.day === 'number' ? WEEKDAY_LABELS[slot.day] : undefined
    const startTime = typeof slot.start === 'string' ? slot.start : ''
    const endTime = typeof slot.end === 'string' ? slot.end : ''
    if (!day || !startTime || !endTime) return []
    return [
      {
        id: `school-legacy-${index}`,
        mode: 'fixed' as const,
        placeName: '',
        groupType: 'particular' as const,
        maxPeople: null,
        schedules: [
          {
            id: `school-legacy-${index}-schedule`,
            timeMode: 'fixed' as const,
            days: [day],
            startTime,
            endTime,
            availabilityMode: 'always' as const,
            availableDates: [],
          },
        ],
        currency: 'MXN' as const,
        unit: 'clase' as const,
        priceCents: null,
      },
    ]
  })
}
