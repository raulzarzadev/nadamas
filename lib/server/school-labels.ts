import 'server-only'

import { schoolMembershipHasRole } from '@/lib/school'
import { studentLabelColor } from '@/lib/student-label-colors'
import { adminDb } from './firebase-admin'
import { requireSchoolAccess } from './school-access'

export async function schoolLabelList(request: Request, schoolId: string, entity: string) {
  const access = await requireSchoolAccess(
    request,
    schoolId,
    entity === 'teachers' ? ['director'] : ['director', 'teacher']
  )
  if (access.response) return { response: access.response }
  const director = access.globalAdmin || schoolMembershipHasRole(access.membership, 'director')
  const scope = `school:${schoolId}${entity === 'teachers' ? ':teachers' : ''}`
  const [labels, assignments, classes] = await Promise.all([
    adminDb.collection('studentLabels').where('scope', '==', scope).get(),
    adminDb.collection('studentLabelAssignments').where('scope', '==', scope).get(),
    director
      ? null
      : adminDb.collection('schoolClassOccurrences').where('schoolId', '==', schoolId).get(),
  ])
  const permitted = new Set<string>()
  if (classes)
    for (const doc of classes.docs) {
      const item = doc.data()
      if (item.teacherIds?.includes(access.caller.uid))
        for (const id of item.studentIds || []) permitted.add(id)
    }
  return {
    data: {
      labels: labels.docs.map((doc) => ({
        id: doc.id,
        name: String(doc.data().name),
        color: studentLabelColor(doc.data().color).id,
      })),
      assignments: Object.fromEntries(
        assignments.docs
          .filter((doc) => director || permitted.has(doc.data().studentId))
          .map((doc) => [doc.data().studentId, doc.data().labelIds || []])
      ),
    },
  }
}
