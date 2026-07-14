import { NextResponse } from 'next/server'
import {
  type BookingInput,
  createConfirmedBookings,
  validateSelections,
} from '@/lib/server/bookings'
import { adminAuth, adminDb } from '@/lib/server/firebase-admin'

export const runtime = 'nodejs'

function getBearerToken(request: Request) {
  const authorization = request.headers.get('authorization') || ''
  const match = authorization.match(/^Bearer (.+)$/i)
  return match?.[1] || null
}

export async function GET(request: Request) {
  const token = getBearerToken(request)
  if (!token) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }

  const caller = await adminAuth.verifyIdToken(token)
  const snapshot = await adminDb.collection('bookings').where('athleteId', '==', caller.uid).get()

  const bookings = snapshot.docs
    .map((doc) => doc.data())
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))

  return NextResponse.json({ bookings })
}

export async function POST(request: Request) {
  const token = getBearerToken(request)
  if (!token) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }

  const caller = await adminAuth.verifyIdToken(token)
  const body = (await request.json()) as BookingInput & {
    selections?: BookingInput[]
    locationId?: string
    athleteProfile?: { name?: string; phone?: string }
  }

  const selections = body.selections?.length ? body.selections : [body]
  if (!validateSelections(selections)) {
    return NextResponse.json({ error: 'Datos de reserva incompletos.' }, { status: 400 })
  }

  const profileName = body.athleteProfile?.name?.trim()
  if (!profileName) {
    return NextResponse.json({ error: 'Completa tu nombre para confirmar.' }, { status: 400 })
  }

  const { bookings } = await createConfirmedBookings({
    uid: caller.uid,
    selections,
    profileName,
    profilePhone: body.athleteProfile?.phone?.trim(),
    callerName: caller.name,
    callerEmail: caller.email,
  })

  return NextResponse.json({ ok: true, bookings })
}
