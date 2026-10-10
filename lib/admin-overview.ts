export type AdminPersonRole = 'coordinator' | 'coach' | 'athlete' | 'admin'

export interface AdminPerson {
  id: string
  name: string
  email: string
  disabled: boolean
  roles: AdminPersonRole[]
  schools: { id: string; name: string }[]
}

export interface AdminSchool {
  id: string
  name: string
  slug: string
  isPublic: boolean
  coordinators: { id: string; name: string }[]
  teachers: { id: string; name: string }[]
  roster: { id: string; name: string; userId: string }[]
  coaches: number
  students: number
  products: number
}

export interface AdminProfile {
  id: string
  name: string
  ownerId: string
  ownerName: string
}

export interface AdminPaymentProduct {
  id: string
  name: string
  scope: string
  scopeName: string
  scopeKind: 'school' | 'coach' | 'unknown'
  priceCents: number
  active: boolean
  mode: 'classes' | 'period'
  classes: number
  months: number
  expiryDays: number | null
  perDay: number | null
  perWeek: number | null
  perPeriod: number | null
}

export interface AdminOverview {
  updatedAt: number
  counts: {
    users: number
    schools: number
    coordinators: number
    coaches: number
    athletes: number
    additionalProfiles: number
    coachProfiles: number
    activeProducts: number
    products: number
    pendingReviews: number
    privateBookings: number
    schoolClasses: number
    pendingClassRequests: number
    pendingPayments: number
    approvedPayments: number
    rejectedPayments: number
  }
  schools: AdminSchool[]
  people: AdminPerson[]
  profiles: AdminProfile[]
  products: AdminPaymentProduct[]
}

export const ADMIN_ROLE_LABELS: Record<AdminPersonRole, string> = {
  coordinator: 'Coordinador',
  coach: 'Entrenador',
  athlete: 'Atleta',
  admin: 'Administrador',
}
