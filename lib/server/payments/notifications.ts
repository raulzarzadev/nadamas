import 'server-only'
import type { PaymentScope } from '@/lib/payments/model'
import { type SchoolMembership, schoolMembershipHasRole } from '@/lib/school'
import { adminDb } from '../firebase-admin'
import { createNotification } from '../notifications'

export async function notifyPendingPayment(
  scope: PaymentScope,
  actorId: string,
  studentName: string
) {
  const recipients = new Set<string>()
  if (scope.kind === 'coach') recipients.add(scope.id)
  else {
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
    [...recipients]
      .filter((id) => id && id !== actorId)
      .map((recipientId) =>
        createNotification({
          recipientId,
          actorId,
          type: 'payment_pending',
          title: 'Pago por confirmar',
          body: `${studentName} registró un pago. Revisa el método y confirma su recepción.`,
          link:
            scope.kind === 'school'
              ? `/school/payments?schoolId=${encodeURIComponent(scope.id)}`
              : '/coach/payments',
        })
      )
  )
}
