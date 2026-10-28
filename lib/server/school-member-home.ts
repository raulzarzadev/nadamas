import 'server-only'

import { addDays, format, startOfWeek } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import type { School, SchoolStudent } from '@/lib/school'
import { type SchoolEvent, splitSchoolEvents } from '@/lib/school-events'
import { adminDb } from './firebase-admin'
import { listSchoolEvents } from './school-events'
import { getSchoolStudentHistory } from './school-student-history'

const HOME_EVENT_LIMIT = 3

export interface MemberHomeProfile {
  studentId: string
  name: string
  nextClass: {
    title: string
    date: string
    startTime: string
    location: string
    pending: boolean
  } | null
  week: { taken: number; total: number }
}

export async function viewerSchoolStudents(
  schoolId: string,
  viewerId: string,
  { includeInactive = false }: { includeInactive?: boolean } = {}
): Promise<SchoolStudent[]> {
  const snapshot = await adminDb
    .collection('schoolStudents')
    .where('schoolId', '==', schoolId)
    .get()
  return snapshot.docs
    .map((doc) => ({ ...doc.data(), id: doc.id }) as SchoolStudent & { guardianId?: string })
    .filter(
      (student) =>
        (includeInactive || student.status === 'active') &&
        (student.studentUserId === viewerId ||
          student.guardianId === viewerId ||
          (Array.isArray(student.managerIds) && student.managerIds.includes(viewerId)) ||
          (Array.isArray(student.guardianIds) && student.guardianIds.includes(viewerId)))
    )
}

function weekRange(timezone: string, now: number) {
  const today = formatInTimeZone(now, timezone, 'yyyy-MM-dd')
  const noon = new Date(`${today}T12:00:00`)
  const monday = startOfWeek(noon, { weekStartsOn: 1 })
  return {
    start: format(monday, 'yyyy-MM-dd'),
    end: format(addDays(monday, 6), 'yyyy-MM-dd'),
  }
}

export async function getSchoolMemberHome(
  school: School,
  viewer: { uid: string; name: string },
  now = Date.now()
): Promise<{ greetingName: string; profiles: MemberHomeProfile[]; events: SchoolEvent[] }> {
  const timezone = school.timezone || 'America/Mexico_City'
  const week = weekRange(timezone, now)
  const [students, allEvents] = await Promise.all([
    viewerSchoolStudents(school.id, viewer.uid),
    listSchoolEvents(school.id, { includePrivate: true }),
  ])
  const profiles = await Promise.all(
    students.map(async (student): Promise<MemberHomeProfile> => {
      const { classes } = await getSchoolStudentHistory(student, timezone)
      const next = classes
        .filter((item) => item.status === 'scheduled')
        .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))[0]
      const inWeek = classes.filter((item) => item.date >= week.start && item.date <= week.end)
      const taken = inWeek.filter((item) => item.status === 'taken').length
      const absent = inWeek.filter((item) => item.status === 'absent').length
      return {
        studentId: student.id,
        name: student.name,
        nextClass: next
          ? {
              title: next.title,
              date: next.date,
              startTime: next.startTime,
              location: next.location,
              pending: next.pending,
            }
          : null,
        week: { taken, total: taken + absent },
      }
    })
  )
  return {
    greetingName: viewer.name,
    profiles: profiles.filter((profile) => profile.nextClass || profile.week.total > 0),
    events: splitSchoolEvents(allEvents, timezone, now).upcoming.slice(0, HOME_EVENT_LIMIT),
  }
}
