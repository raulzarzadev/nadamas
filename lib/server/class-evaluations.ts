import {
  type ClassEvaluation,
  canEvaluateBooking,
  type PublicClassEvaluation,
  publicClassEvaluation,
} from '@/lib/class-evaluation'
import type { Booking } from '@/lib/coach-booking'
import { adminDb } from '@/lib/server/firebase-admin'

export async function saveClassEvaluation(id: string, uid: string, evaluation: ClassEvaluation) {
  return adminDb.runTransaction(async (transaction) => {
    const bookingRef = adminDb.collection('bookings').doc(id)
    const snapshot = await transaction.get(bookingRef)
    const booking = snapshot.data() as Booking | undefined
    if (!booking || booking.athleteId !== uid) return 404
    if (!canEvaluateBooking(booking)) return 409
    const { privateComment, ...publicFields } = evaluation
    transaction.set(adminDb.collection('classEvaluations').doc(id), {
      ...publicFields,
      id,
      coachId: booking.coachId,
      date: booking.date,
      updatedAt: Date.now(),
    })
    transaction.set(adminDb.collection('privateClassEvaluations').doc(id), {
      privateComment,
      athleteId: uid,
      athleteName: booking.athleteName || 'Alumno',
      coachId: booking.coachId,
    })
    return 200
  })
}
export async function getClassEvaluations(field: 'coachId' | 'athleteId', uid: string) {
  const privateDocs = await adminDb
    .collection('privateClassEvaluations')
    .where(field, '==', uid)
    .get()
  const publicDocs = privateDocs.empty
    ? []
    : await adminDb.getAll(
        ...privateDocs.docs.map((doc) => adminDb.collection('classEvaluations').doc(doc.id))
      )
  const privateById = new Map(privateDocs.docs.map((doc) => [doc.id, doc.data()]))
  return publicDocs
    .filter((doc) => doc.exists)
    .map((doc) => ({
      ...(doc.data() as PublicClassEvaluation),
      privateComment: privateById.get(doc.id)?.privateComment || '',
      ...(field === 'coachId'
        ? { athleteName: privateById.get(doc.id)?.athleteName || 'Alumno' }
        : {}),
    }))
}
export async function getPublicClassEvaluations(coachId: string) {
  const snapshot = await adminDb
    .collection('classEvaluations')
    .where('coachId', '==', coachId)
    .get()
  return snapshot.docs
    .map((doc) => publicClassEvaluation(doc.id, doc.data() as PublicClassEvaluation))
    .sort((a, b) => b.updatedAt - a.updatedAt)
}
