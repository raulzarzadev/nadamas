import 'server-only'
import { NextResponse } from 'next/server'
import { normalizeRoles } from '@/lib/roles'
import { adminAuth, adminDb } from './firebase-admin'
import { getBearerToken } from './school-access'

export async function requirePersonalCoach(request: Request) {
  const token = getBearerToken(request)
  if (!token)
    return {
      response: NextResponse.json({ error: 'Inicia sesión para continuar.' }, { status: 401 }),
    }
  let uid: string
  try {
    uid = (await adminAuth.verifyIdToken(token, true)).uid
  } catch {
    return {
      response: NextResponse.json({ error: 'Inicia sesión para continuar.' }, { status: 401 }),
    }
  }
  const user = (await adminDb.collection('users').doc(uid).get()).data()
  if (!user || user.accountDisabled === true || !normalizeRoles(user).coach)
    return {
      response: NextResponse.json(
        { error: 'No tienes permiso para gestionar esta clase.' },
        { status: 403 }
      ),
    }
  return { uid, user }
}
