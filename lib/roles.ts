export type RoleName = 'athlete' | 'coach' | 'admin'

export interface Roles {
  athlete: true
  coach: boolean
  admin: boolean
}

interface RoleSource {
  roles?: Partial<Roles> | null
  isCoach?: boolean | null
}

/**
 * Normalize a user doc into a complete Roles object.
 * - athlete is always granted
 * - coach falls back to legacy `isCoach` when `roles` is absent
 * - admin is only ever true from an explicit roles.admin value
 */
export function normalizeRoles(user: RoleSource | null | undefined): Roles {
  const r = user?.roles ?? undefined
  return {
    athlete: true,
    coach: r ? r.coach === true : user?.isCoach === true,
    admin: r ? r.admin === true : false,
  }
}

export function hasRole(roles: Roles, role: RoleName): boolean {
  return roles[role] === true
}

/**
 * Resolve a safe active role: the stored value if still granted,
 * otherwise fall back to 'athlete'.
 */
export function resolveActiveRole(
  stored: string | null | undefined,
  roles: Roles
): RoleName {
  if (
    (stored === 'athlete' || stored === 'coach' || stored === 'admin') &&
    hasRole(roles, stored)
  ) {
    return stored
  }
  return 'athlete'
}

export const ACTIVE_ROLE_STORAGE_KEY = 'nadamas.activeRole'
