import type { RoleName } from '@/lib/roles'

export interface NavLink {
  href: string
  label: string
  mobileLabel: string
  icon: 'home' | 'search' | 'chart' | 'calendar' | 'users' | 'badge' | 'user'
}

export const NAV_BY_ROLE: Record<RoleName, NavLink[]> = {
  athlete: [
    { href: '/athlete/home', label: 'Inicio', mobileLabel: 'Inicio', icon: 'home' },
    { href: '/athlete/find-coach', label: 'Buscar coach', mobileLabel: 'Buscar', icon: 'search' },
    { href: '/athlete/progress', label: 'Mi progreso', mobileLabel: 'Progreso', icon: 'chart' },
    { href: '/athlete/bookings', label: 'Mis reservas', mobileLabel: 'Reservas', icon: 'calendar' },
    { href: '/profile', label: 'Perfil', mobileLabel: 'Perfil', icon: 'user' },
  ],
  coach: [
    { href: '/coach/home', label: 'Inicio', mobileLabel: 'Inicio', icon: 'home' },
    { href: '/coach/agenda', label: 'Agenda', mobileLabel: 'Agenda', icon: 'calendar' },
    { href: '/coach/students', label: 'Alumnos', mobileLabel: 'Alumnos', icon: 'users' },
    { href: '/coach/coach-profile', label: 'Mi perfil de coach', mobileLabel: 'Perfil coach', icon: 'badge' },
    { href: '/profile', label: 'Perfil', mobileLabel: 'Perfil', icon: 'user' },
  ],
  admin: [
    { href: '/admin/home', label: 'Inicio', mobileLabel: 'Inicio', icon: 'home' },
    { href: '/admin/verify-queue', label: 'Verificaciones', mobileLabel: 'Verificar', icon: 'badge' },
    { href: '/admin/users', label: 'Usuarios', mobileLabel: 'Usuarios', icon: 'users' },
    { href: '/profile', label: 'Perfil', mobileLabel: 'Perfil', icon: 'user' },
  ],
}

export const ROLE_LABEL: Record<RoleName, string> = {
  athlete: 'Atleta',
  coach: 'Entrenador',
  admin: 'Admin',
}
