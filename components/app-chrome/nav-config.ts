import type { RoleName } from '@/lib/roles'

export interface NavLink {
  href: string
  label: string
  mobileLabel: string
  icon: 'home' | 'search' | 'chart' | 'calendar' | 'users' | 'badge' | 'user'
}

// Primary nav = the role-specific destinations shown as the sub-navbar directly
// under the header. Keep the role-switcher menu focused on account and mode
// actions, not frequent navigation.
export const PRIMARY_NAV_BY_ROLE: Record<RoleName, NavLink[]> = {
  athlete: [
    { href: '/athlete/find-coach', label: 'Buscar coach', mobileLabel: 'Buscar', icon: 'search' },
    { href: '/athlete/bookings', label: 'Mis clases', mobileLabel: 'Clases', icon: 'calendar' },
    { href: '/athlete/progress', label: 'Mi progreso', mobileLabel: 'Progreso', icon: 'chart' },
  ],
  coach: [
    { href: '/coach/agenda', label: 'Mis horarios', mobileLabel: 'Horarios', icon: 'calendar' },
    { href: '/coach/students', label: 'Alumnos', mobileLabel: 'Alumnos', icon: 'users' },
    {
      href: '/coach/coach-profile',
      label: 'Perfil de coach',
      mobileLabel: 'Perfil',
      icon: 'badge',
    },
  ],
  admin: [
    {
      href: '/admin/verify-queue',
      label: 'Verificaciones',
      mobileLabel: 'Verificar',
      icon: 'badge',
    },
    { href: '/admin/bookings', label: 'Clases', mobileLabel: 'Clases', icon: 'calendar' },
    { href: '/admin/users', label: 'Usuarios', mobileLabel: 'Usuarios', icon: 'users' },
  ],
}

// Secondary nav = low-frequency account-adjacent links in the role-pill dropdown.
export const SECONDARY_NAV_BY_ROLE: Record<RoleName, NavLink[]> = {
  athlete: [
    { href: '/athlete/home', label: 'Inicio', mobileLabel: 'Inicio', icon: 'home' },
    { href: '/profile', label: 'Mi perfil', mobileLabel: 'Perfil', icon: 'user' },
  ],
  coach: [
    { href: '/coach/home', label: 'Inicio', mobileLabel: 'Inicio', icon: 'home' },
    { href: '/profile', label: 'Mi perfil', mobileLabel: 'Perfil', icon: 'user' },
  ],
  admin: [
    { href: '/admin/home', label: 'Inicio', mobileLabel: 'Inicio', icon: 'home' },
    { href: '/profile', label: 'Mi perfil', mobileLabel: 'Perfil', icon: 'user' },
  ],
}

export const ROLE_LABEL: Record<RoleName, string> = {
  athlete: 'Atleta',
  coach: 'Entrenador',
  admin: 'Admin',
}
