'use client'

import CoachAgenda from './CoachAgenda'

export type ClassDetailsSelection = {
  coachId: string
  date: string
  startTime: string
  groupType: 'particular' | 'grupal'
}
/** Shared class configuration, roster and training UI for school and personal classes. */
export default function ClassDetailsSection({
  slots,
  schoolId,
  canManage,
}: {
  slots: ClassDetailsSelection[]
  schoolId?: string
  canManage: boolean
}) {
  if (!slots.length) return null
  return (
    <section className="grid gap-3">
      {slots.map((slot) => (
        <CoachAgenda
          key={`${slot.coachId}|${slot.groupType}`}
          schoolId={schoolId}
          aggregateSchool={Boolean(schoolId)}
          manageSchoolSchedule={Boolean(schoolId) && canManage}
          readOnly={!canManage}
          initialDate={slot.date}
          detailTarget={slot}
          showClassDetails={canManage}
        />
      ))}
    </section>
  )
}
