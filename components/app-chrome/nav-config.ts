import type { RoleName } from '@/lib/roles'

export interface NavLink {
  href: string
  label: string
  mobileLabel: string
  icon: 'home' | 'search' | 'chart' | 'calendar' | 'users' | 'badge' | 'user'
}

export const NAV_BY_ROLE: Record<RoleName, NavLink[]> = {
  athlete: [
    { href: '/athlete/find-coach', label: 'Buscar coach', mobileLabel: 'Buscar', icon: 'search' },
    { href: '/athlete/home', label: 'Incio', mobileLabel: 'Incio', icon: 'home' },
    { href: '/athlete/progress', label: 'Mi progreso', mobileLabel: 'Progreso', icon: 'chart' },
    { href: '/athlete/bookings', label: 'Mis reservas', mobileLabel: 'Reservas', icon: 'calendar' },
    { href: '/profile', label: 'Mi perfil', mobileLabel: 'Perfil', icon: 'user' },
  ],
  coach: [
    { href: '/coach/home', label: 'Incio', mobileLabel: 'Incio', icon: 'home' },
    {
      href: '/coach/coach-profile',
      label: 'Perfil de Coach',
      mobileLabel: 'Perfil coach',
      icon: 'badge',
    },
    { href: '/coach/agenda', label: 'Agenda', mobileLabel: 'Agenda', icon: 'calendar' },
    { href: '/coach/students', label: 'Alumnos', mobileLabel: 'Alumnos', icon: 'users' },
    { href: '/profile', label: 'Mi perfil', mobileLabel: 'Perfil', icon: 'user' },
  ],
  admin: [
    { href: '/admin/home', label: 'Incio', mobileLabel: 'Incio', icon: 'home' },
    {
      href: '/admin/verify-queue',
      label: 'Verificaciones',
      mobileLabel: 'Verificar',
      icon: 'badge',
    },
    { href: '/admin/bookings', label: 'Clases agendadas', mobileLabel: 'Clases', icon: 'calendar' },
    { href: '/admin/users', label: 'Usuarios', mobileLabel: 'Usuarios', icon: 'users' },
    { href: '/profile', label: 'Mi perfil', mobileLabel: 'Perfil', icon: 'user' },
  ],
}

export const ROLE_LABEL: Record<RoleName, string> = {
  athlete: 'Atleta',
  coach: 'Entrenador',
  admin: 'Admin',
}
