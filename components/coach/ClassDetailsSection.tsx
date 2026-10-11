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
  const first = slots[0]
  return (
    <section className="overflow-hidden bg-white sm:rounded-2xl sm:border sm:border-(--c-border)">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-(--c-border) px-4 py-2">
        <h2 className="text-sm font-bold">
          {new Date(`${first.date}T12:00:00`).toLocaleDateString('es-MX', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}{' '}
          · {first.startTime}
        </h2>
      </div>
      <div className="grid gap-3 p-3">
        {slots.map((slot) => (
          <CoachAgenda
            key={`${slot.coachId}|${slot.groupType}`}
            schoolId={schoolId}
            aggregateSchool={Boolean(schoolId)}
            manageSchoolSchedule={Boolean(schoolId) && canManage}
            readOnly={!canManage}
            initialDate={slot.date}
            detailTarget={slot}
          />
        ))}
      </div>
    </section>
  )
}
