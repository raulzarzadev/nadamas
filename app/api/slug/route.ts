import { NextResponse } from 'next/server'
import { publicNameFromUser } from '@/lib/public-name'
import { adminAuth, adminDb } from '@/lib/server/firebase-admin'
import { ensureUniqueSlug, isSlugAvailable, setSlug } from '@/lib/server/slugs'
import { isValidSlug, normalizeSlug, type SlugKind } from '@/lib/slug'

export const runtime = 'nodejs'

function getBearerToken(request: Request) {
  const match = (request.headers.get('authorization') || '').match(/^Bearer (.+)$/i)
  return match?.[1] || null
}

function parseKind(value: string | null): SlugKind | null {
  return value === 'coach' || value === 'athlete' ? value : null
}

// GET ?self=1 → the caller's current slugs. GET ?slug=&kind= → availability.
export async function GET(request: Request) {
  const token = getBearerToken(request)
  if (!token) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  const caller = await adminAuth.verifyIdToken(token)
  const url = new URL(request.url)

  if (url.searchParams.get('self')) {
    const snap = await adminDb.collection('users').doc(caller.uid).get()
    return NextResponse.json({ slugs: snap.data()?.slugs || {} })
  }

  const slug = normalizeSlug(url.searchParams.get('slug') || '')
  if (!slug) return NextResponse.json({ valid: false, available: false })
  if (!isValidSlug(slug)) return NextResponse.json({ valid: false, available: false })
  const kind = parseKind(url.searchParams.get('kind'))
  if (!kind) return NextResponse.json({ valid: false, available: false })
  const available = await isSlugAvailable(slug, caller.uid, kind)
  return NextResponse.json({ valid: true, available })
}

// POST { kind, slug? } → claim a slug (or auto-generate from the visible name).
export async function POST(request: Request) {
  const token = getBearerToken(request)
  if (!token) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  const caller = await adminAuth.verifyIdToken(token)
  const body = (await request.json().catch(() => ({}))) as { kind?: string; slug?: string }
  const kind = parseKind(body.kind ?? null)
  if (!kind) return NextResponse.json({ error: 'Tipo inválido.' }, { status: 400 })

  let requested = normalizeSlug(body.slug || '')
  if (!requested) {
    const snap = await adminDb.collection('users').doc(caller.uid).get()
    requested = await ensureUniqueSlug(publicNameFromUser(snap.data()), caller.uid, kind)
  }

  const result = await setSlug({ uid: caller.uid, kind, requested })
  if (!result.ok) {
    const message = result.reason === 'taken' ? 'Ese enlace ya está en uso.' : 'Enlace inválido.'
    return NextResponse.json({ error: message }, { status: 409 })
  }
  return NextResponse.json({ ok: true, slug: result.slug })
}
