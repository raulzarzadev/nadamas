export interface CoachPhoto {
  url: string
}

export interface CoachGalleryPhoto extends CoachPhoto {
  label?: string
}

export interface CoachSocial {
  type: string
  url: string
}

export type CoachPublicLinkKind =
  | 'whatsapp'
  | 'youtube'
  | 'facebook'
  | 'instagram'
  | 'tiktok'
  | 'website'
  | 'other'

export interface CoachPublicLink {
  kind: CoachPublicLinkKind
  value: string
}

export interface CoachYoutubeLink {
  url: string
  label?: string
}

export interface CoachPrivateContact {
  type: string
  value: string
}

export interface CoachDocument {
  url: string
  name: string
}

export interface CoachIdentityVerification {
  status: 'not_submitted' | 'pending' | 'verified' | 'rejected'
  document?: CoachDocument
  submittedAt?: number
  reviewedAt?: number
  reviewedBy?: string
  adminNote?: string
  notificationSentAt?: number
  reviewNotificationSentAt?: number
}

export interface CoachAvailabilitySlot {
  days: string[]
  startTime: string
  endTime: string
}

export interface CoachTeachingLocation {
  id: string
  name: string
  locationUrl?: string
  imageUrl?: string
  availability: CoachAvailabilitySlot[]
}

export interface CoachPriceOption {
  id: string
  title: string
  amount: number | null
  currency: 'MXN'
  unit: 'clase' | 'sesión' | 'mes' | 'paquete'
  durationMinutes?: number | null
  details?: string
}

export interface CoachVerification {
  status: 'pending' | 'verified'
  autoScore: number
  adminScoreOverride?: number
}

/** Public document: coaches/{uid} — readable by athletes. */
import type { CoachMetrics } from '@/lib/coach-metrics'

export interface CoachPublic {
  id?: string
  userId?: string
  skills?: Record<string, string>
  metrics?: CoachMetrics
  bio?: string
  galleryPhotos?: CoachGalleryPhoto[]
  facePhoto?: CoachPhoto
  workplacePhotos?: CoachPhoto[]
  achievementPhotos?: CoachPhoto[]
  publicLinks?: CoachPublicLink[]
  teachingLocations?: CoachTeachingLocation[]
  priceOptions?: CoachPriceOption[]
  socials?: CoachSocial[]
  youtubeLinks?: CoachYoutubeLink[]
  // Reserved, no UI in this scope:
  presentationVideo?: { kind: 'youtube' | 'upload'; value: string }
  /** Coach opt-in: when true the profile is listed/searchable in the marketplace. */
  publicProfileVisible?: boolean
  verification?: CoachVerification
  createdAt?: number
  updatedAt?: number
}

/** Private subdoc: coaches/{uid}/private/profile — admin/owner only. */
export interface CoachPrivate {
  id?: string
  privateContacts?: CoachPrivateContact[]
  identityVerification?: CoachIdentityVerification
  idDocuments?: CoachDocument[]
  certifications?: CoachDocument[]
  adminNotes?: string
  updatedAt?: number
}
