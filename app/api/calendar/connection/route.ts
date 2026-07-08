import { NextResponse } from 'next/server'
import {
  calendarUrlFor,
  getCalendarFeed,
  normalizeReminderOffsets,
  normalizeRole,
  revokeCalendarFeed,
  upsertCalendarFeed,
} from '@/lib/server/calendar-feeds'
import { adminAuth, adminDb } from '@/lib/server/firebase-admin'

export const runtime = 'nodejs'

function getBearerToken(request: Request) {
  const match = (request.headers.get('authorization') || '').match(/^Bearer (.+)$/i)
  return match?.[1] || null
}

async function requireCaller(request: Request) {
  const token = getBearerToken(request)
  if (!token) return null
  return adminAuth.verifyIdToken(token)
}

async function canUseRole(uid: string, role: 'athlete' | 'coach') {
  if (role === 'athlete') return true
  const userDoc = await adminDb.collection('users').doc(uid).get()
  const roles = userDoc.data()?.roles || {}
  return roles.coach === true || roles.admin === true
}

function connectionPayload(request: Request, feed: Awaited<ReturnType<typeof getCalendarFeed>>) {
  return {
    connected: Boolean(feed?.active),
    role: feed?.role ?? null,
    reminderOffsets: feed?.reminderOffsets ?? [],
    calendarUrl: feed?.active ? calendarUrlFor(request, feed.token) : null,
    updatedAt: feed?.updatedAt ?? null,
  }
}

export async function GET(request: Request) {
  const caller = await requireCaller(request)
  if (!caller) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

  const role = normalizeRole(new URL(request.url).searchParams.get('role'))
  if (!role) return NextResponse.json({ error: 'Rol inválido.' }, { status: 400 })
  if (!(await canUseRole(caller.uid, role))) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }

  const feed = await getCalendarFeed(caller.uid, role)
  return NextResponse.json(connectionPayload(request, feed))
}

export async function POST(request: Request) {
  const caller = await requireCaller(request)
  if (!caller) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as {
    role?: string
    reminderOffsets?: unknown
  }
  const role = normalizeRole(body.role || null)
  if (!role) return NextResponse.json({ error: 'Rol inválido.' }, { status: 400 })
  if (!(await canUseRole(caller.uid, role))) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }

  const feed = await upsertCalendarFeed(
    caller.uid,
    role,
    normalizeReminderOffsets(body.reminderOffsets)
  )
  return NextResponse.json(connectionPayload(request, feed))
}

export async function DELETE(request: Request) {
  const caller = await requireCaller(request)
  if (!caller) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

  const role = normalizeRole(new URL(request.url).searchParams.get('role'))
  if (!role) return NextResponse.json({ error: 'Rol inválido.' }, { status: 400 })
  if (!(await canUseRole(caller.uid, role))) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }

  await revokeCalendarFeed(caller.uid, role)
  return NextResponse.json({ connected: false, role, reminderOffsets: [], calendarUrl: null })
}
