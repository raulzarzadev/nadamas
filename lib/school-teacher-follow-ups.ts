import { fromZonedTime } from 'date-fns-tz'
import type { Booking } from '@/lib/coach-booking'
import type { SchoolClassOccurrence } from '@/lib/school'

export type TeacherClassFollowUp = {
  id: string
  date: string
  startTime: string
  endTime: string
  title: string
  students: number
  comment: string
}

export function teacherClassFollowUps({
  coachId,
  bookings,
  classes,
  notes,
  now = Date.now(),
}: {
  coachId: string
  bookings: Booking[]
  classes: SchoolClassOccurrence[]
  notes: Array<{ coachId: string; date: string; startTime: string; note?: string }>
  now?: number
}) {
  const comments = new Map(
    notes
      .filter((note) => note.coachId === coachId)
      .map((note) => [`${note.date}|${note.startTime}`, note.note?.trim() || ''])
  )
  const rows = new Map<string, TeacherClassFollowUp & { studentIds: Set<string> }>()
  const add = (
    date: string,
    startTime: string,
    endTime: string,
    title: string,
    students: string[],
    timezone = 'America/Mazatlan'
  ) => {
    if (!(fromZonedTime(`${date}T${endTime}`, timezone).getTime() < now)) return
    const id = `${date}|${startTime}`
    const previous = rows.get(id)
    const studentIds = new Set([...(previous?.studentIds || []), ...students])
    rows.set(id, {
      id,
      date,
      startTime,
      endTime,
      title: previous?.title || title,
      students: studentIds.size,
      studentIds,
      comment: comments.get(id) || '',
    })
  }
  for (const occurrence of classes) {
    if (
      !occurrence.teacherIds?.includes(coachId) ||
      !['scheduled', 'completed'].includes(occurrence.status)
    )
      continue
    add(
      occurrence.date,
      occurrence.startTime,
      occurrence.endTime,
      occurrence.title,
      occurrence.studentIds || [],
      occurrence.timezone
    )
  }
  for (const booking of bookings) {
    const coaches = booking.assignedCoachIds?.length ? booking.assignedCoachIds : [booking.coachId]
    if (!coaches.includes(coachId) || booking.status !== 'confirmed' || booking.noShow) continue
    add(
      booking.date,
      booking.startTime,
      booking.endTime,
      booking.schoolClassTitle || 'Clase',
      [booking.athleteProfileId || booking.athleteId].filter(Boolean)
    )
  }
  return [...rows.values()]
    .map(({ studentIds: _studentIds, ...row }) => row)
    .sort((a, b) => `${b.date}|${b.startTime}`.localeCompare(`${a.date}|${a.startTime}`))
}
