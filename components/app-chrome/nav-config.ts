import type { RoleName } from '@/lib/roles'

export interface NavLink {
  href: string
  label: string
}

export const NAV_BY_ROLE: Record<RoleName, NavLink[]> = {
  athlete: [
    { href: '/athlete/home', label: 'Inicio' },
    { href: '/athlete/find-coach', label: 'Buscar coach' },
    { href: '/athlete/progress', label: 'Mi progreso' },
    { href: '/athlete/bookings', label: 'Mis reservas' },
    { href: '/profile', label: 'Perfil' },
  ],
  coach: [
    { href: '/coach/home', label: 'Inicio' },
    { href: '/coach/agenda', label: 'Agenda' },
    { href: '/coach/students', label: 'Alumnos' },
    { href: '/coach/coach-profile', label: 'Mi perfil de coach' },
    { href: '/profile', label: 'Perfil' },
  ],
  admin: [
    { href: '/admin/home', label: 'Inicio' },
    { href: '/admin/verify-queue', label: 'Verificaciones' },
    { href: '/admin/users', label: 'Usuarios' },
    { href: '/profile', label: 'Perfil' },
  ],
}

export const ROLE_LABEL: Record<RoleName, string> = {
  athlete: 'Atleta',
  coach: 'Entrenador',
  admin: 'Admin',
}
