import { NextResponse } from 'next/server'
import {
  MAX_GALLERY_PHOTOS,
  normalizeHomeSections,
  type SchoolGalleryPhoto,
} from '@/lib/school-home'
import { isHexColor } from '@/lib/school-theme'
import { requireSchoolAccess } from '@/lib/server/school-access'
import {
  getSchoolById,
  isAllowedSchoolImageUrl,
  updateSchoolHomeSettings,
} from '@/lib/server/schools'

export const runtime = 'nodejs'
interface RouteProps {
  params: Promise<{ schoolId: string }>
}

const bad = (error: string) => NextResponse.json({ error }, { status: 400 })

export async function PATCH(request: Request, { params }: RouteProps) {
  const { schoolId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director'])
  if (access.response) return access.response
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const input: Parameters<typeof updateSchoolHomeSettings>[1] = {}

  if (body.coverUrl !== undefined) {
    if (body.coverUrl === null) input.coverUrl = null
    else if (typeof body.coverUrl === 'string' && isAllowedSchoolImageUrl(body.coverUrl.trim()))
      input.coverUrl = body.coverUrl.trim()
    else return bad('La foto de portada no es válida.')
  }
  if (body.customColor !== undefined) {
    if (body.customColor === null) input.customColor = null
    else if (isHexColor(body.customColor)) input.customColor = body.customColor
    else return bad('Elige un color válido.')
  }
  if (body.galleryUrls !== undefined) {
    const urls = body.galleryUrls
    if (
      !Array.isArray(urls) ||
      urls.length > MAX_GALLERY_PHOTOS ||
      !urls.every((url) => typeof url === 'string' && isAllowedSchoolImageUrl(url))
    )
      return bad(`Revisa las fotos de la galería (máximo ${MAX_GALLERY_PHOTOS}).`)
    const school = await getSchoolById(schoolId)
    const existing = new Map((school?.gallery ?? []).map((photo) => [photo.url, photo]))
    const now = Date.now()
    const seen = new Set<string>()
    input.gallery = (urls as string[]).flatMap((url): SchoolGalleryPhoto[] => {
      if (seen.has(url)) return []
      seen.add(url)
      return [existing.get(url) ?? { id: crypto.randomUUID(), url, createdAt: now }]
    })
  }
  if (body.homeSections !== undefined) {
    const sections = normalizeHomeSections(body.homeSections)
    if (!sections) return bad('Las secciones no son válidas.')
    input.homeSections = sections
  }

  const school = await updateSchoolHomeSettings(schoolId, input)
  if (!school) return NextResponse.json({ error: 'Escuela no encontrada.' }, { status: 404 })
  return NextResponse.json({ school })
}
