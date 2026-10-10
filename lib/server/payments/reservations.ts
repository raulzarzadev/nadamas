import { runPaymentTransaction } from './transaction'
import 'server-only'
import type { Transaction } from 'firebase-admin/firestore'
import {
  changeGrantUsage,
  PaymentRuleError,
  reserveGrant,
  settleGrant,
} from '@/lib/payments/engine'
import {
  DEFAULT_PAYMENT_SETTINGS,
  type PaymentAccount,
  type PaymentReservation,
  type PaymentSettings,
} from '@/lib/payments/model'
import { adminDb } from '../firebase-admin'
import { accountRef, movement, paymentId, settingsRef } from './store'

export type PaymentEvent = {
  schoolStudentId?: boolean
  scope: string
  studentId: string
  sourceId: string
  date: string
  startTime: string
  endTime?: string
  actorId: string
  action: 'reserve' | 'consume' | 'release'
  allowPackage?: boolean
  exceptionReason?: string
  organizerCancelled?: boolean
}
// Read every document before returning the writer, so callers can share the same
// Firestore transaction with class/booking/attendance writes without partial charges.
export async function preparePaymentEvents(tx: Transaction, events: PaymentEvent[]) {
  const scopes = [...new Set(events.map((event) => event.scope))]
  const configs = new Map<string, PaymentSettings>()
  const configDocs = scopes.length ? await tx.getAll(...scopes.map(settingsRef)) : []
  scopes.forEach((scope, index) => {
    configs.set(scope, {
      ...DEFAULT_PAYMENT_SETTINGS,
      ...configDocs[index].data(),
    } as PaymentSettings)
  })
  // Disabled billing does not load wallets or reservation documents for new bookings.
  events = events.filter(
    (event) =>
      event.action !== 'reserve' ||
      configs.get(event.scope)?.classesEnabled ||
      configs.get(event.scope)?.periodsEnabled
  )
  // Legacy bookings may identify a school participant by user/profile ID.
  for (const scope of scopes.filter((key) => key.startsWith('school:'))) {
    if (
      !events.some((event) => event.scope === scope) ||
      (!configs.get(scope)?.classesEnabled && !configs.get(scope)?.periodsEnabled)
    )
      continue
    const students = await tx.get(
      adminDb.collection('schoolStudents').where('schoolId', '==', scope.slice(7))
    )
    const known = new Set(students.docs.map((doc) => doc.id))
    events = events.map((event) => {
      if (event.scope !== scope || event.schoolStudentId || known.has(event.studentId)) return event
      const matches = students.docs.filter(
        (doc) =>
          doc.data().additionalProfileId === event.studentId ||
          (!doc.data().additionalProfileId && doc.data().studentUserId === event.studentId)
      )
      if (matches.length !== 1) throw new PaymentRuleError('payment_invalid')
      return { ...event, studentId: matches[0].id }
    })
  }
  const wallets = new Map<string, PaymentAccount>()
  const refs = new Map<string, ReturnType<typeof accountRef>>()
  for (const event of events)
    refs.set(paymentId(event.scope, event.studentId), accountRef(event.scope, event.studentId))
  const walletKeys = [...refs.keys()]
  const walletDocs = refs.size ? await tx.getAll(...refs.values()) : []
  walletKeys.forEach((key, index) => {
    wallets.set(
      key,
      structuredClone((walletDocs[index].data() as PaymentAccount) || { grants: [] })
    )
  })
  const holdRefs = events.map((event) =>
    adminDb
      .collection('paymentReservations')
      .doc(paymentId(event.scope, event.studentId, event.sourceId))
  )
  const snapshots = holdRefs.length ? await tx.getAll(...holdRefs) : []
  const changed = new Map<string, PaymentReservation>()
  const dirty = new Set<string>()
  const entries: ReturnType<typeof movement>[] = []
  events.forEach((event, index) => {
    const settings = configs.get(event.scope)
    const key = paymentId(event.scope, event.studentId)
    const account = wallets.get(key)
    if (!settings || !account) throw new PaymentRuleError('payment_invalid')
    let hold =
      changed.get(holdRefs[index].id) || (snapshots[index].data() as PaymentReservation | undefined)
    if (event.action === 'reserve') {
      if (hold && hold.state !== 'released') {
        if (hold.date !== event.date || hold.startTime !== event.startTime)
          throw new PaymentRuleError('payment_invalid')
        return
      }
      if (!settings.classesEnabled && !settings.periodsEnabled) return
      const grant = event.exceptionReason
        ? null
        : reserveGrant(account, event.date, settings, Boolean(event.allowPackage))
      if (!grant) {
        hold = {
          id: holdRefs[index].id,
          scope: event.scope,
          studentId: event.studentId,
          sourceId: event.sourceId,
          date: event.date,
          startTime: event.startTime,
          grantId: null,
          state: 'exception',
          actorId: event.actorId,
          reason: event.exceptionReason || 'Reserva sin saldo permitida por configuración',
          createdAt: Date.now(),
        }
      } else {
        changeGrantUsage(grant, event.date, 1, 0)
        hold = {
          id: holdRefs[index].id,
          scope: event.scope,
          studentId: event.studentId,
          sourceId: event.sourceId,
          date: event.date,
          startTime: event.startTime,
          grantId: grant.id,
          state: 'reserved',
          actorId: event.actorId,
          createdAt: Date.now(),
          endsAt:
            paymentStartsAt(event.date, event.endTime || event.startTime, settings.timezone) +
            (event.endTime ? 0 : 3600000),
        }
        dirty.add(key)
      }
    } else {
      if (!hold || hold.state === 'exception') return
      const startsAt = paymentStartsAt(hold.date, hold.startTime, settings.timezone)
      const late =
        event.action === 'release' &&
        !event.organizerCancelled &&
        startsAt - Date.now() < settings.cancellationHours * 3600000
      if (hold.state === 'consumed' && event.action === 'release' && event.organizerCancelled) {
        const grantId = hold.grantId
        const grant = account.grants.find((item) => item.id === grantId)
        if (!grant) throw new PaymentRuleError('payment_invalid')
        changeGrantUsage(grant, hold.date, 0, -1)
        hold.state = 'released'
      } else if (!settleGrant(account, hold, event.action, late)) return
      delete hold.endsAt
      dirty.add(key)
    }
    changed.set(hold.id, hold)
    entries.push(
      movement(
        event.scope,
        event.studentId,
        event.actorId,
        hold.state,
        hold.state === 'exception'
          ? `Excepción: ${hold.reason}`
          : `${hold.state === 'reserved' ? 'Clase reservada' : hold.state === 'released' ? 'Clase devuelta' : 'Clase consumida'} · ${event.date} ${event.startTime}`,
        1
      )
    )
  })
  return () => {
    for (const key of dirty) {
      const ref = refs.get(key)
      if (!ref) throw new PaymentRuleError('payment_invalid')
      tx.set(ref, { ...wallets.get(key), updatedAt: Date.now() }, { merge: true })
    }
    for (const [id, hold] of changed)
      tx.set(adminDb.collection('paymentReservations').doc(id), hold)
    for (const entry of entries) tx.set(adminDb.collection('paymentMovements').doc(entry.id), entry)
  }
}
function dateParts(date: string, time: string): [number, number, number, number, number] {
  const [y, m, d] = date.split('-').map(Number)
  const [h, min] = time.split(':').map(Number)
  return [y, m - 1, d, h, min]
}
function timezoneOffset(utc: number, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(utc)
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value)
  return (
    Date.UTC(
      value('year'),
      value('month') - 1,
      value('day'),
      value('hour'),
      value('minute'),
      value('second')
    ) - utc
  )
}
export async function paymentTransaction(
  events: PaymentEvent[],
  write: (tx: Transaction) => void | Promise<void>
) {
  return runPaymentTransaction(async (tx) => {
    const apply = await preparePaymentEvents(tx, events)
    await write(tx)
    apply()
  })
}
export function paymentErrorResponse(error: unknown) {
  if (!(error instanceof PaymentRuleError)) return null
  const message =
    error.code === 'package_confirmation_required'
      ? 'Confirma que deseas usar una clase de tu paquete.'
      : error.code === 'payment_required'
        ? 'No hay saldo o vigencia disponible para este horario.'
        : error.code === 'payment_limit'
          ? 'Contacta al responsable para revisar tu cuenta.'
          : 'Revisa los datos de pago e inténtalo de nuevo.'
  return { error: message, code: error.code }
}

export function paymentStartsAt(date: string, time: string, timezone: string) {
  const utc = Date.UTC(...dateParts(date, time))
  let result = utc
  for (let iteration = 0; iteration < 3; iteration++)
    result = utc - timezoneOffset(result, timezone)
  return result
}
export async function settleOverduePayments(scope?: string) {
  const query = scope
    ? adminDb
        .collection('paymentReservations')
        .where('scope', '==', scope)
        .where('endsAt', '<=', Date.now())
        .limit(200)
    : adminDb.collection('paymentReservations').where('endsAt', '<=', Date.now()).limit(200)
  const snapshot = await query.get()
  const overdue = snapshot.docs
    .map((doc) => doc.data() as PaymentReservation)
    .filter(
      (hold) =>
        hold.state === 'reserved' && typeof hold.endsAt === 'number' && hold.endsAt <= Date.now()
    )
    .slice(0, 200)
  for (let start = 0; start < overdue.length; start += 25)
    await Promise.all(
      overdue.slice(start, start + 25).map((hold) =>
        paymentTransaction(
          [
            {
              scope: hold.scope,
              studentId: hold.studentId,
              sourceId: hold.sourceId,
              date: hold.date,
              startTime: hold.startTime,
              action: 'consume',
              actorId: 'automatic',
            },
          ],
          () => {}
        )
      )
    )
  return overdue.length
}
