export const SCHOOL_TIMEZONE_OPTIONS = [
  { value: 'America/Mexico_City', label: 'Ciudad de México' },
  { value: 'America/Monterrey', label: 'Monterrey' },
  { value: 'America/Tijuana', label: 'Tijuana' },
  { value: 'America/Hermosillo', label: 'Hermosillo' },
  { value: 'America/Cancun', label: 'Cancún' },
  { value: 'UTC', label: 'UTC' },
] as const

export const DEFAULT_SCHOOL_TIMEZONE = 'America/Mexico_City'

export const SCHOOL_PALETTES = [
  {
    value: 'ocean',
    label: 'Océano',
    primary: '#062b49',
    secondary: '#0099c7',
    accent: '#b9efff',
    surface: '#effbff',
  },
  {
    value: 'coral',
    label: 'Coral',
    primary: '#641c2b',
    secondary: '#f05d4f',
    accent: '#ffd1c7',
    surface: '#fff5f2',
  },
  {
    value: 'forest',
    label: 'Bosque',
    primary: '#12372a',
    secondary: '#00a878',
    accent: '#bdf5d8',
    surface: '#f0fcf6',
  },
  {
    value: 'sunset',
    label: 'Atardecer',
    primary: '#32104f',
    secondary: '#c43d9b',
    accent: '#f5c4ed',
    surface: '#fcf3ff',
  },
  {
    value: 'mandarina',
    label: 'Mandarina',
    primary: '#542000',
    secondary: '#f47721',
    accent: '#ffd39f',
    surface: '#fff8ee',
  },
  {
    value: 'cobalto',
    label: 'Cobalto',
    primary: '#111b5e',
    secondary: '#4169e1',
    accent: '#cbd4ff',
    surface: '#f3f5ff',
  },
] as const

export type SchoolPalette = (typeof SCHOOL_PALETTES)[number]['value']
export const DEFAULT_SCHOOL_PALETTE: SchoolPalette = 'ocean'

export function isSchoolPalette(value: unknown): value is SchoolPalette {
  return SCHOOL_PALETTES.some((palette) => palette.value === value)
}

export type SchoolBookingMode = 'request' | 'direct'

export const SCHOOL_ROLES = ['director', 'teacher', 'student'] as const
export type SchoolRole = (typeof SCHOOL_ROLES)[number]

export interface School {
  id: string
  name: string
  slug: string
  description: string
  logoUrl?: string | null
  palette?: SchoolPalette
  timezone: string
  createdBy: string
  directorId: string
  isPublic: boolean
  bookingMode?: SchoolBookingMode
  showCoaches?: boolean
  showCoachesSchedules?: boolean
  showStudents?: boolean
  createdAt: number
  updatedAt: number
}

export interface SchoolMembership {
  id: string
  schoolId: string
  userId: string
  role: SchoolRole
  /** New memberships can carry several school roles; role remains the primary legacy role. */
  roles?: SchoolRole[]
  status: 'active' | 'pending' | 'suspended'
  createdAt: number
  updatedAt: number
}

export function normalizeSchoolMembership(membership: SchoolMembership): SchoolMembership {
  const normalize = (role: SchoolRole): SchoolRole =>
    (role as string) === 'guardian' ? 'student' : role
  return {
    ...membership,
    role: normalize(membership.role),
    roles: membership.roles ? [...new Set(membership.roles.map(normalize))] : undefined,
  }
}

export function schoolMembershipHasRole(
  membership: Pick<SchoolMembership, 'role' | 'roles'> | null | undefined,
  role: SchoolRole
) {
  return Boolean(
    membership &&
      (membership.role === role ||
        (role === 'student' &&
          ((membership.role as string) === 'guardian' ||
            (membership.roles as string[] | undefined)?.includes('guardian'))) ||
        membership.roles?.includes(role) ||
        (role === 'teacher' &&
          (membership.role === 'director' || membership.roles?.includes('director'))))
  )
}

export function isSafeSchoolUrl(value: string) {
  if (!value) return true
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

export type SchoolInvitationRole = 'teacher' | 'student'

export interface SchoolInvitation {
  id: string
  schoolId: string
  email: string
  role: SchoolInvitationRole
  studentId?: string | null
  studentData?: SchoolInvitationStudentData | null
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  expiresAt: number
  invitedBy: string
  acceptedBy?: string | null
  acceptedAt?: number | null
  createdAt: number
  updatedAt: number
}

export type SchoolGender = 'varonil' | 'femenil' | 'otro'

export interface SchoolInvitationStudentData {
  name: string
  birthDate: string
  gender: SchoolGender
  guardianName: string
  guardianRelationship: string
  guardianPhone: string
}

export interface SchoolStudent {
  id: string
  schoolId: string
  name: string
  birthDate: string
  gender: SchoolGender
  additionalProfileId?: string
  managerIds?: string[]
  guardianIds: string[]
  guardianName: string
  guardianRelationship: string
  guardianPhone: string
  guardianEmail: string
  studentEmail?: string
  studentUserId?: string
  status: 'active' | 'inactive'
  createdAt: number
  updatedAt: number
}

export interface SchoolTeacherProfile {
  id: string
  schoolId: string
  userId: string
  name: string
  phone: string
  bio: string
  profileComplete: boolean
  createdAt: number
  updatedAt: number
}

export interface SchoolLocation {
  id: string
  schoolId: string
  name: string
  address: string
  mapUrl: string
  createdAt: number
  updatedAt: number
}

export interface SchoolClassOccurrence {
  id: string
  seriesId: string
  schoolId: string
  title: string
  type: 'individual' | 'group'
  date: string
  startTime: string
  endTime: string
  timezone: string
  teacherIds: string[]
  studentIds: string[]
  location: string
  locationUrl: string
  visibility?: 'public' | 'private'
  status: 'scheduled' | 'completed' | 'cancelled'
  createdAt: number
  updatedAt: number
}

export interface SchoolClassRequest {
  id: string
  schoolId: string
  studentId: string
  requestedBy: string
  type: 'individual' | 'group'
  preferredDays: number[]
  preferredStartTime: string
  preferredEndTime: string
  startDate: string
  endDate: string
  durationMinutes: number
  location: string
  locationUrl: string
  notes: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  createdAt: number
  updatedAt: number
}
