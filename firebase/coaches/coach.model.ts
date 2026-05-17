export interface CoachPhoto {
  url: string
}

export interface CoachSocial {
  type: string
  url: string
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

export interface CoachVerification {
  status: 'pending' | 'verified'
  autoScore: number
  adminScoreOverride?: number
}

/** Public document: coaches/{uid} — readable by athletes. */
export interface CoachPublic {
  id?: string
  userId?: string
  skills?: Record<string, string>
  bio?: string
  facePhoto?: CoachPhoto
  workplacePhotos?: CoachPhoto[]
  achievementPhotos?: CoachPhoto[]
  socials?: CoachSocial[]
  youtubeLinks?: CoachYoutubeLink[]
  // Reserved, no UI in this scope:
  presentationVideo?: { kind: 'youtube' | 'upload'; value: string }
  verification?: CoachVerification
  createdAt?: number
  updatedAt?: number
}

/** Private subdoc: coaches/{uid}/private/profile — admin/owner only. */
export interface CoachPrivate {
  id?: string
  privateContacts?: CoachPrivateContact[]
  idDocuments?: CoachDocument[]
  certifications?: CoachDocument[]
  adminNotes?: string
  updatedAt?: number
}
