import 'server-only'
import { randomUUID } from 'node:crypto'
import { FieldValue } from 'firebase-admin/firestore'
import { NextResponse } from 'next/server'
import { reportServerError } from '@/lib/analytics/server'
import { adminDb } from './firebase-admin'
import { paymentErrorResponse } from './payments/reservations'

/** Publish only after an authorized mutation succeeds; never expose agenda data. */
export function withSchoolAgendaUpdate<Args extends unknown[]>(
  handler: (request: Request, ...args: Args) => Promise<Response>
) {
  return async (request: Request, ...args: Args) => {
    const input =
      request.method === 'DELETE'
        ? Object.fromEntries(new URL(request.url).searchParams)
        : await request
            .clone()
            .json()
            .catch(() => ({}))
    let response: Response
    try {
      response = await handler(request, ...args)
    } catch (error) {
      const paymentError = paymentErrorResponse(error)
      if (paymentError) return NextResponse.json(paymentError, { status: 409 })
      throw error
    }
    if (!response.ok) return response
    const pathSchoolId = new URL(request.url).pathname.match(/^\/api\/schools\/([^/]+)\//)?.[1]
    const schoolIds = new Set<string>()
    const add = (value: unknown) => {
      if (typeof value === 'string' && value && !value.includes('/')) schoolIds.add(value)
    }
    add(pathSchoolId && decodeURIComponent(pathSchoolId))
    if (new URL(request.url).pathname.startsWith('/api/coach/')) add(input?.schoolId)
    const payload = await response
      .clone()
      .json()
      .catch(() => ({}))
    add(payload.schoolId)
    add(payload.booking?.schoolId)
    for (const booking of Array.isArray(payload.bookings) ? payload.bookings : [])
      add(booking.schoolId)
    // Cancellation endpoints can return only {ok}; recover the booking's school.
    const bookingId =
      new URL(request.url).pathname.match(/^\/api\/bookings\/([^/]+)$/)?.[1] ||
      (new URL(request.url).pathname === '/api/coach/agenda/bookings' ? input?.id : null)
    try {
      if (typeof bookingId === 'string' && bookingId && !bookingId.includes('/')) {
        const booking = await adminDb.collection('bookings').doc(bookingId).get()
        add(booking.data()?.schoolId)
      }
      if (schoolIds.size) {
        const batch = adminDb.batch()
        for (const schoolId of schoolIds)
          batch.set(adminDb.collection('schoolAgendaUpdates').doc(schoolId), {
            lastUpdate: FieldValue.serverTimestamp(),
            revision: randomUUID(),
          })
        await batch.commit()
      }
    } catch (error) {
      // The mutation already committed; do not tell the user it failed.
      reportServerError('SCHOOL_AGENDA_UPDATE', error, request)
    }
    return response
  }
}
