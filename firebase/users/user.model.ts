import type { Roles } from '@/lib/roles'

export interface AppUser {
  id: string
  uid?: string
  displayName?: string
  name?: string
  email?: string
  photoURL?: string
  roles?: Partial<Roles>
  isCoach?: boolean
  createdAt?: number
  updatedAt?: number
}
