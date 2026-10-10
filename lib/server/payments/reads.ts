import 'server-only'
import type { DocumentData } from 'firebase-admin/firestore'
import { adminDb } from '../firebase-admin'

/** Bounded bulk reads; student filters run in Firestore, never once per row. */
export async function paymentHistory(
  collection: 'paymentOrders' | 'paymentMovements' | 'paymentReservations',
  scope: string,
  studentIds: string[],
  manager: boolean
) {
  if (!manager && !studentIds.length) return []
  const groups = manager
    ? [null]
    : Array.from({ length: Math.ceil(studentIds.length / 30) }, (_, index) =>
        studentIds.slice(index * 30, index * 30 + 30)
      )
  const field = collection === 'paymentReservations' ? 'date' : 'createdAt'
  const results = await Promise.all(
    groups.map(async (ids) => {
      let query = adminDb.collection(collection).where('scope', '==', scope)
      if (ids) query = query.where('studentId', 'in', ids)
      if (collection === 'paymentReservations') query = query.where('state', '==', 'consumed')
      const snapshot = await query.orderBy(field, 'desc').limit(200).get()
      return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as DocumentData)
    })
  )
  return results
    .flat()
    .sort((a, b) =>
      field === 'date' ? String(b.date).localeCompare(String(a.date)) : b.createdAt - a.createdAt
    )
    .slice(0, 200)
}
