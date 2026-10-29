import type { RoleName } from '@/lib/roles'

export interface NavLink {
  href: string
  label: string
  mobileLabel: string
  icon: 'home' | 'search' | 'chart' | 'calendar' | 'users' | 'badge' | 'user' | 'bell' | 'training'
}

// Primary nav = the role-specific destinations shown as the sub-navbar directly
// under the header. Keep the role-switcher menu focused on account and mode
// actions, not frequent navigation.
export const PRIMARY_NAV_BY_ROLE: Record<RoleName, NavLink[]> = {
  athlete: [
    { href: '/athlete/home', label: 'Inicio', mobileLabel: 'Inicio', icon: 'home' },
    { href: '/athlete/training', label: 'Entrenos', mobileLabel: 'Entrenos', icon: 'training' },
    { href: '/athlete/progress', label: 'Progreso', mobileLabel: 'Progreso', icon: 'chart' },
  ],
  coach: [
    { href: '/coach/home', label: 'Inicio', mobileLabel: 'Inicio', icon: 'home' },
    { href: '/coach/agenda', label: 'Mis horarios', mobileLabel: 'Horarios', icon: 'calendar' },
    { href: '/coach/students', label: 'Alumnos', mobileLabel: 'Alumnos', icon: 'users' },
  ],
  school: [
    { href: '/school', label: 'Inicio', mobileLabel: 'Inicio', icon: 'home' },
    { href: '/school/students', label: 'Alumnos', mobileLabel: 'Alumnos', icon: 'users' },
    { href: '/school/coaches', label: 'Profes', mobileLabel: 'Profes', icon: 'badge' },
    { href: '/school/classes', label: 'Horarios', mobileLabel: 'Horarios', icon: 'calendar' },
  ],
  admin: [
    { href: '/admin/home', label: 'Resumen', mobileLabel: 'Resumen', icon: 'home' },
    {
      href: '/admin/verify-queue',
      label: 'Verificaciones',
      mobileLabel: 'Verificar',
      icon: 'badge',
    },
    { href: '/admin/bookings', label: 'Clases', mobileLabel: 'Clases', icon: 'calendar' },
    { href: '/admin/users', label: 'Usuarios', mobileLabel: 'Usuarios', icon: 'users' },
    { href: '/admin/marketing', label: 'Email marketing', mobileLabel: 'Correos', icon: 'bell' },
  ],
}

// Secondary nav = low-frequency account-adjacent links in the role-pill dropdown.
export const SECONDARY_NAV_BY_ROLE: Record<RoleName, NavLink[]> = {
  athlete: [{ href: '/profile', label: 'Mi perfil', mobileLabel: 'Perfil', icon: 'user' }],
  coach: [{ href: '/profile', label: 'Mi perfil', mobileLabel: 'Perfil', icon: 'user' }],
  school: [{ href: '/profile', label: 'Mi perfil', mobileLabel: 'Perfil', icon: 'user' }],
  admin: [{ href: '/profile', label: 'Mi perfil', mobileLabel: 'Perfil', icon: 'user' }],
}

export const ROLE_LABEL: Record<RoleName, string> = {
  athlete: 'Atleta',
  coach: 'Entrenador',
  school: 'Coordinador',
  admin: 'Admin',
}
