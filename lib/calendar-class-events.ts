import type { Booking } from './coach-booking'

/** A class keeps its identity when its roster changes. */
export function classSlotKey(
  booking: Pick<Booking, 'schoolId' | 'coachId' | 'date' | 'startTime' | 'endTime'>
) {
  return JSON.stringify([
    booking.schoolId || '',
    booking.coachId,
    booking.date,
    booking.startTime,
    booking.endTime,
  ])
}

export function calendarClassEvents(bookings: Booking[], role: 'coach' | 'athlete') {
  if (role === 'athlete')
    return bookings.map((booking) => ({
      booking,
      uid: booking.id,
      names: [booking.athleteName],
      grouped: false,
    }))
  const slots = new Map<string, Booking[]>()
  for (const booking of bookings) {
    const key = classSlotKey(booking)
    slots.set(key, [...(slots.get(key) || []), booking])
  }
  return [...slots.entries()].map(([key, members]) => {
    const active = members.filter((member) => member.status !== 'cancelled')
    const visibleMembers = active.length ? active : members
    const students = new Map<string, string>()
    const historicalIds = new Set(
      members.flatMap((member) => member.schoolClassStudentIds || [member.athleteId])
    )
    for (const member of visibleMembers) {
      if (member.schoolClassStudents) {
        for (const student of member.schoolClassStudents) students.set(student.id, student.name)
      } else if (member.athleteId) students.set(member.athleteId, member.athleteName)
    }
    const names = [...students.values()].sort((a, b) => a.localeCompare(b, 'es'))
    const grouped =
      members.some((member) => member.groupType === 'grupal') || historicalIds.size > 1
    const booking = {
      ...visibleMembers[0],
      updatedAt: Math.max(...members.map((member) => member.updatedAt || member.createdAt)),
    }
    return {
      booking,
      uid: grouped ? `class-${encodeURIComponent(key)}` : booking.id,
      names,
      grouped,
    }
  })
}
