import type { Roles } from '@/lib/roles'

export interface AppUser {
  id: string
  uid?: string
  displayName?: string
  name?: string
  email?: string
  /** Visible public name set by the user. */
  nickname?: string
  /** Legal given name(s) — private, cotejado con INE. */
  firstName?: string
  /** Legal surname(s) — private, cotejado con INE. */
  lastName?: string
  phone?: string
  profileCompletedAt?: number
  photoURL?: string
  /** Short public bio shown on the athlete's public profile card. */
  athleteBio?: string
  /** Current public slugs per role (mirror of the `slugs` registry). */
  slugs?: { coach?: string; athlete?: string }
  roles?: Partial<Roles>
  isCoach?: boolean
  createdAt?: number
  updatedAt?: number
  accountDisabled?: boolean
  accountDisabledAt?: number | null
  accountDisabledBy?: string | null
}
