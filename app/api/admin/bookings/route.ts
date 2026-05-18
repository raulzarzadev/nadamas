import { NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/server/firebase-admin'

export const runtime = 'nodejs'

async function getAdmin(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '')
  if (!token) return null
  const caller = await adminAuth.verifyIdToken(token)
  const callerDoc = await adminDb.collection('users').doc(caller.uid).get()
  return callerDoc.data()?.roles?.admin === true ? caller : null
}

export async function GET(request: Request) {
  const admin = await getAdmin(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })

  const snapshot = await adminDb.collection('bookings').get()
  const bookings = snapshot.docs
    .map((doc) => doc.data())
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))

  return NextResponse.json({ bookings })
}
