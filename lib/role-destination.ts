import type { RoleName, Roles } from '@/lib/roles'

export function entryRoleForSession(roles: Roles, activeRole?: RoleName): RoleName {
  if (activeRole === 'admin' && roles.admin) return 'admin'
  if (roles.coach) return 'coach'
  return 'athlete'
}

export function destinationForRole(role: RoleName): string {
  if (role === 'coach') return '/coach/agenda'
  if (role === 'admin') return '/admin/home'
  return '/athlete/bookings'
}
