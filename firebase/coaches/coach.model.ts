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

export type CoachOfferingMode = 'fixed' | 'home' | 'online'
export type CoachOfferingGroup = 'particular' | 'grupal'
export type CoachOfferingUnit = 'clase' | 'sesión' | 'mes' | 'paquete'

export interface CoachOfferingSchedule {
  id: string
  days: string[]
  startTime: string
  endTime: string
  availabilityMode?: 'always' | 'next_week' | 'dates'
  availableDates?: string[]
}

export interface CoachClassOffering {
  id: string
  mode: CoachOfferingMode
  /** fixed mode */
  placeName?: string
  locationUrl?: string
  imageUrl?: string
  /** home mode — free text coverage zone */
  coverageArea?: string
  /** online mode — optional platform/link details */
  onlineDetails?: string
  groupType: CoachOfferingGroup
  /** only meaningful when groupType === 'grupal' */
  maxPeople?: number | null
  schedules?: CoachOfferingSchedule[]
  /** Legacy single-schedule fields kept for existing docs. */
  days?: string[]
  startTime?: string
  endTime?: string
  durationMinutes?: number | null
  /** Legacy pesos field. Read-only for old docs. */
  price?: number | null
  /** Canonical amount stored as integer cents. */
  priceCents?: number | null
  currency: 'MXN'
  unit: CoachOfferingUnit
  details?: string
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
  /** New unified model. Replaces teachingLocations + priceOptions. */
  classOfferings?: CoachClassOffering[]
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
