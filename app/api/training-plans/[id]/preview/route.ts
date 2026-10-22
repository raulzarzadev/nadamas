import { NextResponse } from 'next/server'
import { getSchoolCaller } from '@/lib/server/school-access'
import { getPlanPreview } from '@/lib/server/training-plan-sharing'
export const runtime = 'nodejs'
type Props = { params: Promise<{ id: string }> }
const headers = { 'Cache-Control': 'private, no-store' }
export async function GET(request: Request, { params }: Props) {
  try {
    const caller = await getSchoolCaller(request)
    if (!caller)
      return NextResponse.json({ error: 'Inicia sesión para continuar.' }, { status: 401, headers })
    const invite = new URL(request.url).searchParams.get('invite') || undefined
    const preview = await getPlanPreview((await params).id, caller.uid, invite)
    // Same body for missing and forbidden so private plans are not discoverable.
    if (!preview)
      return NextResponse.json(
        { error: 'Este entreno no está disponible o el enlace ya no es válido.' },
        { status: 404, headers }
      )
    return NextResponse.json(preview, { headers })
  } catch (error) {
    console.error('[TRAINING_PLAN_PREVIEW]', error)
    return NextResponse.json(
      { error: 'Ups, algo salió mal. Inténtalo de nuevo más tarde.' },
      { status: 500, headers }
    )
  }
}
