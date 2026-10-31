import 'server-only'
import { NextResponse } from 'next/server'
import { normalizeRoles } from '@/lib/roles'
import { adminAuth, adminDb } from './firebase-admin'
import { getBearerToken } from './school-access'

export async function requireAthleteTrainingAccess(request: Request) {
  const token = getBearerToken(request)
  if (!token)
    return {
      response: NextResponse.json({ error: 'Inicia sesión para continuar.' }, { status: 401 }),
    }
  try {
    const { uid } = await adminAuth.verifyIdToken(token, true)
    const snapshot = await adminDb.collection('users').doc(uid).get()
    const user = snapshot.data()
    if (!user || user.accountDisabled === true || !normalizeRoles(user).athlete)
      return {
        response: NextResponse.json(
          { error: 'No tienes permiso para gestionar estos entrenos.' },
          { status: 403 }
        ),
      }
    return { uid, user }
  } catch {
    return {
      response: NextResponse.json({ error: 'Inicia sesión para continuar.' }, { status: 401 }),
    }
  }
}
