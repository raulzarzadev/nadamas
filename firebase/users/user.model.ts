import type { Roles } from '@/lib/roles'

export interface AppUser {
  id: string
  uid?: string
  displayName?: string
  name?: string
  email?: string
  phone?: string
  profileCompletedAt?: number
  photoURL?: string
  roles?: Partial<Roles>
  isCoach?: boolean
  createdAt?: number
  updatedAt?: number
  accountDisabled?: boolean
  accountDisabledAt?: number | null
  accountDisabledBy?: string | null
}
