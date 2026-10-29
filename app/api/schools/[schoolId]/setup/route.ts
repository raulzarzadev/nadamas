import { NextResponse } from 'next/server'
import { reportServerError } from '@/lib/analytics/server'
import { schoolSetupSteps } from '@/lib/school-setup'
import { adminDb } from '@/lib/server/firebase-admin'
import { requireSchoolAccess } from '@/lib/server/school-access'
import { subscriptionAccess } from '@/lib/subscriptions/engine'
import type { SchoolSubscription } from '@/lib/subscriptions/model'
export const runtime = 'nodejs'
export async function GET(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director'])
  if (access.response) return access.response
  try {
    const school = await adminDb.collection('schools').doc(schoolId).get()
    if (!school.exists)
      return NextResponse.json({ error: 'No encontramos la escuela.' }, { status: 404 })
    const ownerId = school.data()?.createdBy || school.data()?.directorId
    const [plans, classes, blocks, offerings, teachers, legacyTeachers, students, subscription] =
      await Promise.all([
        adminDb
          .collection('paymentProducts')
          .where('scope', '==', `school:${schoolId}`)
          .where('active', '==', true)
          .limit(1)
          .get(),
        adminDb
          .collection('schoolClassOccurrences')
          .where('schoolId', '==', schoolId)
          .where('status', '==', 'scheduled')
          .limit(1)
          .get(),
        adminDb.collection('coachScheduleBlocks').where('schoolId', '==', schoolId).limit(1).get(),
        adminDb
          .collection('schoolCoachOfferings')
          .where('schoolId', '==', schoolId)
          .select('classOfferings')
          .get(),
        adminDb
          .collection('schoolMemberships')
          .where('schoolId', '==', schoolId)
          .where('status', '==', 'active')
          .where('roles', 'array-contains', 'teacher')
          .select('userId')
          .limit(2)
          .get(),
        adminDb
          .collection('schoolMemberships')
          .where('schoolId', '==', schoolId)
          .where('status', '==', 'active')
          .where('role', '==', 'teacher')
          .select('userId')
          .limit(2)
          .get(),
        adminDb
          .collection('schoolStudents')
          .where('schoolId', '==', schoolId)
          .where('status', '==', 'active')
          .limit(1)
          .get(),
        adminDb.collection('schoolSubscriptions').doc(schoolId).get(),
      ])
    return NextResponse.json(
      {
        schoolId,
        subscription: subscriptionAccess(
          (subscription.data() as SchoolSubscription) || null,
          Date.now()
        ),
        schoolName: String(school.data()?.name || ''),
        slug: String(school.data()?.slug || ''),
        steps: schoolSetupSteps({
          paymentPlan: !plans.empty,
          schedules:
            !classes.empty ||
            !blocks.empty ||
            offerings.docs.some(
              (doc) =>
                Array.isArray(doc.data().classOfferings) && doc.data().classOfferings.length > 0
            ),
          teachers: [...teachers.docs, ...legacyTeachers.docs].some(
            (doc) => doc.data().userId && doc.data().userId !== ownerId
          ),
          students: !students.empty,
        }),
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch (error) {
    reportServerError('SCHOOL_SETUP', error, request)
    return NextResponse.json(
      { error: 'No pudimos cargar los pasos de tu escuela. Inténtalo de nuevo.' },
      { status: 500 }
    )
  }
}
