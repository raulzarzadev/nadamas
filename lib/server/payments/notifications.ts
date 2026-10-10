import 'server-only'
import type { PaymentScope } from '@/lib/payments/model'
import { type SchoolMembership, schoolMembershipHasRole } from '@/lib/school'
import { adminDb } from '../firebase-admin'
import { createNotification } from '../notifications'

export async function notifyPendingPayment(
  scope: PaymentScope,
  actorId: string,
  studentName: string,
  receiptUploaded = false
) {
  const recipients = new Set<string>()
  if (scope.kind === 'coach') recipients.add(scope.id)
  else {
    const school = await adminDb.collection('schools').doc(scope.id).get()
    for (const id of [school.data()?.ownerId, school.data()?.directorId])
      if (typeof id === 'string' && id) recipients.add(id)
    const memberships = await adminDb
      .collection('schoolMemberships')
      .where('schoolId', '==', scope.id)
      .get()
    for (const doc of memberships.docs) {
      const member = doc.data() as SchoolMembership
      if (member.status === 'active' && schoolMembershipHasRole(member, 'director'))
        recipients.add(member.userId)
    }
  }
  await Promise.all(
    [...recipients].filter(Boolean).map((recipientId) =>
      createNotification({
        recipientId,
        actorId,
        type: 'payment_pending',
        title: receiptUploaded ? 'Comprobante por verificar' : 'Pago por confirmar',
        body: receiptUploaded
          ? `${studentName} envió un comprobante de transferencia. Revisa y confirma el pago.`
          : `${studentName} solicitó verificar un pago. Revisa el método y confirma su recepción.`,
        link:
          scope.kind === 'school'
            ? `/school/payments?schoolId=${encodeURIComponent(scope.id)}&tab=orders`
            : '/coach/payments?tab=orders',
      })
    )
  )
}
