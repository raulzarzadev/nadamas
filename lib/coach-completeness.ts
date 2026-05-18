import type { CoachPrivate, CoachPublic } from '@/firebase/coaches/coach.model'
import { resolveOfferings } from '@/lib/coach-offerings'

/**
 * Single source of truth for what a coach must complete before the profile
 * counts as ready (used by the profile page, the gate, and dashboards).
 */
export function coachMissingItems({
  pub,
  priv,
  firstName,
  lastName,
}: {
  pub?: CoachPublic | null
  priv?: CoachPrivate | null
  firstName?: string
  lastName?: string
}): string[] {
  const pubVal = pub || {}
  const privVal = priv || {}
  const gallery = pubVal.galleryPhotos || []

  const hasFacePhoto = !!(
    pubVal.facePhoto?.url || gallery.find((photo) => photo.label === 'Yo')?.url
  )
  const hasLocation = resolveOfferings(pubVal).length > 0
  const hasBio = !!pubVal.bio?.trim()
  const hasMetrics = !!pubVal.metrics && Object.keys(pubVal.metrics).length > 0
  const hasIne = !!privVal.identityVerification?.document?.url
  const hasLegalName = !!(firstName?.trim() && lastName?.trim())

  return [
    !hasMetrics && 'Carta de estilo',
    !hasBio && 'Bio corta',
    !hasFacePhoto && 'Foto tuya',
    !hasLocation && 'Lugar y horarios',
    !hasLegalName && 'Nombre y apellidos',
    !hasIne && 'Documento de identidad',
  ].filter(Boolean) as string[]
}
