import { NextResponse } from 'next/server'
import { reportServerError } from '@/lib/analytics/server'
import { getAdminOverview } from '@/lib/server/admin-overview'
import { adminAuth, adminDb } from '@/lib/server/firebase-admin'
import { getBearerToken } from '@/lib/server/school-access'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const token = getBearerToken(request)
  if (!token) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  let uid: string
  try {
    uid = (await adminAuth.verifyIdToken(token, true)).uid
  } catch {
    return NextResponse.json({ error: 'Vuelve a iniciar sesión.' }, { status: 401 })
  }
  try {
    const user = (await adminDb.collection('users').doc(uid).get()).data()
    if (user?.roles?.admin !== true || user.accountDisabled === true)
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
    return NextResponse.json(await getAdminOverview(), {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error) {
    reportServerError('ADMIN_OVERVIEW_READ', error, request)
    return NextResponse.json(
      { error: 'No pudimos cargar el panel. Inténtalo de nuevo.', code: 'admin_overview_failed' },
      { status: 500 }
    )
  }
}
