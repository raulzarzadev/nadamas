import { db } from '.'
import {
  datesToFirebaseFromat,
  formatResponse,
  normalizeDocs
} from './firebase-helpers'

export const getPayments = async () => {
  return await db
    .collection('payments')
    .orderBy('date')
    .limit(20)
    .get()
    .then(({ docs }) => normalizeDocs(docs))
    .catch((err) => console.log('err', err))
}
export const getAthletePayments = async (athleteId) => {
  return await db
    .collection('payments')
    .where('athleteId', '==', athleteId)
    .get()
    .then(({ docs }) => normalizeDocs(docs))
    .catch((err) => console.log('get_payments_err', err))
}

export const getLastAthletePayment = async (athleteId) => {
  return await db
    .collection('payments')
    .where('athleteId', '==', athleteId)
    .orderBy('date')
    .limit(1)
    .get()
    .then(({ docs }) => normalizeDocs(docs))
    .catch((err) => console.log('get_payments_err', err))
}
export const createOrUpdatePayment = async (payment) => {
  // search
  const { id } = payment

  if (id) {
    //update
    return _update_payment(payment)
  } else {
    //create
    return _create_payment(payment)
  }
  // console.log('payment', payment)

  //const paymentRef =  db.collection('payments').doc(payment?.id).id
  //console.log('paymentRef', paymentRef)

  // if exist id update
  // else create
  // return await _create_payment(payment)
}
export const removePayment = async (paymentId) => {
  return await _remove_payment(paymentId)
}

export const updatePayment = async (payment) => {
  return await _update_payment(payment)
}
const _update_payment = async (payment) => {
  return await db
    .collection('payments')
    .doc(payment.id)
    .update({ ...payment, ...datesToFirebaseFromat(payment) })
    .then((res) => formatResponse(true, 'PAYMENT_UPDATED', res))
    .catch((err) => console.log('err', err))
}

const _remove_payment = async (paymentId) => {
  return await db
    .collection('payments')
    .doc(paymentId)
    .delete()
    .then((res) => formatResponse(true, 'PAYMENT_DELETED', res))
    .catch((err) => formatResponse(false, 'DELETE_ERROR', err))
}

const _create_payment = async (payment) => {
  return await db
    .collection('payments')
    .add({ ...payment, ...datesToFirebaseFromat(payment) })
    .then((res) => {
      return { ok: true, type: 'PAYMENT_CREATED', res }
    })
    .catch((err) => console.log('err', err))
}
