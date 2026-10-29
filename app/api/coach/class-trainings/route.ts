import { NextResponse } from 'next/server'
import { normalizeClassTraining } from '@/lib/class-training'
import { schoolMembershipHasRole } from '@/lib/school'
import { adminDb } from '@/lib/server/firebase-admin'
import { requirePersonalCoach } from '@/lib/server/personal-class-access'
import { getSchoolMembership } from '@/lib/server/school-access'

export async function GET(request: Request) {
  const access = await requirePersonalCoach(request)
  if (access.response) return access.response

  try {
    const [personal, school] = await Promise.all([
      adminDb.collection('coachClassNotes').where('coachId', '==', access.uid).get(),
      adminDb.collection('schoolClassNotes').where('coachId', '==', access.uid).get(),
    ])
    const schoolIds = [
      ...new Set(
        school.docs
          .map((doc) => doc.data().schoolId)
          .filter((id): id is string => typeof id === 'string' && Boolean(id))
      ),
    ]
    const memberships = await Promise.all(
      schoolIds.map((id) => getSchoolMembership(id, access.uid))
    )
    const allowedSchools = new Set(
      schoolIds.filter((_, index) => {
        const membership = memberships[index]
        return (
          membership?.status === 'active' &&
          (schoolMembershipHasRole(membership, 'teacher') ||
            schoolMembershipHasRole(membership, 'director'))
        )
      })
    )
    const items = [...personal.docs, ...school.docs]
      .flatMap((doc) => {
        const data = doc.data()
        if (data.schoolId && !allowedSchools.has(data.schoolId)) return []
        const training = normalizeClassTraining(data.training || []) || []
        if (!training.length || typeof data.date !== 'string' || typeof data.startTime !== 'string')
          return []
        return [
          {
            id: doc.id,
            schoolId: data.schoolId || null,
            date: data.date,
            startTime: data.startTime,
            training,
          },
        ]
      })
      .sort((a, b) => `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`))
    return NextResponse.json({ items }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json(
      { error: 'No pudimos cargar los entrenos de tus clases.' },
      { status: 500 }
    )
  }
}
