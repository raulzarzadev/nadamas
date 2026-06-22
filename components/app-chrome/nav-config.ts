import type { RoleName } from '@/lib/roles'

export interface NavLink {
  href: string
  label: string
  mobileLabel: string
  icon: 'home' | 'search' | 'chart' | 'calendar' | 'users' | 'badge' | 'user'
}

// Primary nav = the two top-level destinations shown as a segmented toggle
// directly under the header (matches the product design). Everything else
// lives in the role-pill menu (SECONDARY_NAV_BY_ROLE) so the bar stays clean.
export const PRIMARY_NAV_BY_ROLE: Record<RoleName, NavLink[]> = {
  athlete: [
    { href: '/athlete/find-coach', label: 'Buscar coach', mobileLabel: 'Buscar', icon: 'search' },
    { href: '/athlete/bookings', label: 'Mis clases', mobileLabel: 'Clases', icon: 'calendar' },
  ],
  coach: [
    { href: '/coach/agenda', label: 'Mis clases', mobileLabel: 'Clases', icon: 'calendar' },
    { href: '/coach/students', label: 'Alumnos', mobileLabel: 'Alumnos', icon: 'users' },
  ],
  admin: [
    {
      href: '/admin/verify-queue',
      label: 'Verificaciones',
      mobileLabel: 'Verificar',
      icon: 'badge',
    },
    { href: '/admin/bookings', label: 'Clases', mobileLabel: 'Clases', icon: 'calendar' },
  ],
}

// Secondary nav = reachable from the role-pill dropdown menu.
export const SECONDARY_NAV_BY_ROLE: Record<RoleName, NavLink[]> = {
  athlete: [
    { href: '/athlete/home', label: 'Inicio', mobileLabel: 'Inicio', icon: 'home' },
    { href: '/athlete/progress', label: 'Mi progreso', mobileLabel: 'Progreso', icon: 'chart' },
    { href: '/profile', label: 'Mi perfil', mobileLabel: 'Perfil', icon: 'user' },
  ],
  coach: [
    { href: '/coach/home', label: 'Inicio', mobileLabel: 'Inicio', icon: 'home' },
    {
      href: '/coach/coach-profile',
      label: 'Perfil de coach',
      mobileLabel: 'Perfil coach',
      icon: 'badge',
    },
    { href: '/profile', label: 'Mi perfil', mobileLabel: 'Perfil', icon: 'user' },
  ],
  admin: [
    { href: '/admin/home', label: 'Inicio', mobileLabel: 'Inicio', icon: 'home' },
    { href: '/admin/users', label: 'Usuarios', mobileLabel: 'Usuarios', icon: 'users' },
    { href: '/profile', label: 'Mi perfil', mobileLabel: 'Perfil', icon: 'user' },
  ],
}

export const ROLE_LABEL: Record<RoleName, string> = {
  athlete: 'Atleta',
  coach: 'Entrenador',
  admin: 'Admin',
}
