import { NextResponse } from 'next/server'
import { schoolMembershipHasRole } from '@/lib/school'
import { adminDb } from '@/lib/server/firebase-admin'
import { requireSchoolAccess } from '@/lib/server/school-access'
import { getSchoolClassOccurrence } from '@/lib/server/school-classes'
import { listSchoolStudents } from '@/lib/server/school-students'

export const runtime = 'nodejs'
interface RouteProps {
  params: Promise<{ schoolId: string }>
}

interface SchoolReviewRecord {
  id: string
  schoolId: string
  occurrenceId: string
  reviewerId: string
  reviewerRole: string | undefined
  teacherId: string
  studentId: string
  rating: number
  comment: string
  createdAt: number
  updatedAt: number
}

export async function GET(request: Request, { params }: RouteProps) {
  const { schoolId } = await params
  const access = await requireSchoolAccess(request, schoolId, [
    'director',
    'teacher',
    'guardian',
    'student',
  ])
  if (access.response) return access.response
  const snapshot = await adminDb.collection('schoolReviews').where('schoolId', '==', schoolId).get()
  let reviews = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<SchoolReviewRecord, 'id'>),
  }))
  if (!access.globalAdmin && schoolMembershipHasRole(access.membership, 'teacher'))
    reviews = reviews.filter(
      (review) => review.reviewerId === access.caller.uid || review.teacherId === access.caller.uid
    )
  if (!access.globalAdmin && schoolMembershipHasRole(access.membership, 'guardian')) {
    const students = await listSchoolStudents(schoolId, access.caller.uid)
    const studentIds = new Set(students.map((student) => student.id))
    reviews = reviews.filter(
      (review) =>
        review.reviewerId === access.caller.uid || studentIds.has(review.studentId as string)
    )
  }
  if (!access.globalAdmin && schoolMembershipHasRole(access.membership, 'student')) {
    const students = await listSchoolStudents(schoolId, undefined, access.caller.uid)
    const studentIds = new Set(students.map((student) => student.id))
    reviews = reviews.filter(
      (review) => review.reviewerId === access.caller.uid || studentIds.has(review.studentId)
    )
  }
  return NextResponse.json({ reviews })
}

export async function POST(request: Request, { params }: RouteProps) {
  const { schoolId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['teacher', 'guardian', 'student'])
  if (access.response) return access.response
  const body = (await request.json().catch(() => ({}))) as {
    occurrenceId?: unknown
    rating?: unknown
    comment?: unknown
    teacherId?: unknown
    studentId?: unknown
  }
  const occurrenceId = typeof body.occurrenceId === 'string' ? body.occurrenceId : ''
  const occurrence = await getSchoolClassOccurrence(schoolId, occurrenceId)
  if (!occurrence || occurrence.status !== 'completed')
    return NextResponse.json(
      { error: 'La clase debe estar completada para evaluarla.' },
      { status: 400 }
    )
  const rating = Number(body.rating)
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    return NextResponse.json({ error: 'La evaluación debe ser de 1 a 5.' }, { status: 400 })
  const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, 1000) : ''
  let teacherId = typeof body.teacherId === 'string' ? body.teacherId : ''
  const studentId = typeof body.studentId === 'string' ? body.studentId : ''
  if (schoolMembershipHasRole(access.membership, 'teacher')) {
    if (
      !occurrence.teacherIds.includes(access.caller.uid) ||
      !studentId ||
      !occurrence.studentIds.includes(studentId)
    )
      return NextResponse.json({ error: 'No puedes evaluar a este alumno.' }, { status: 403 })
    teacherId = access.caller.uid
  } else {
    const students = schoolMembershipHasRole(access.membership, 'guardian')
      ? await listSchoolStudents(schoolId, access.caller.uid)
      : await listSchoolStudents(schoolId, undefined, access.caller.uid)
    if (
      !studentId ||
      !students.some((student) => student.id === studentId) ||
      !occurrence.studentIds.includes(studentId) ||
      !teacherId ||
      !occurrence.teacherIds.includes(teacherId)
    )
      return NextResponse.json({ error: 'No puedes evaluar a este coach.' }, { status: 403 })
  }
  const ref = adminDb
    .collection('schoolReviews')
    .doc(`${occurrenceId}_${access.caller.uid}_${teacherId}_${studentId}`)
  const review = {
    id: ref.id,
    schoolId,
    occurrenceId,
    reviewerId: access.caller.uid,
    reviewerRole: schoolMembershipHasRole(access.membership, 'teacher')
      ? 'teacher'
      : schoolMembershipHasRole(access.membership, 'guardian')
        ? 'guardian'
        : 'student',
    teacherId,
    studentId,
    rating,
    comment,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  await ref.set(review, { merge: true })
  return NextResponse.json({ review })
}
