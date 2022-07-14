import { ICONS } from "../components/Icon/icon-list"

export const ROUTES = {
  PROFILE: {
    name: 'PROFILE',
    label: 'Perfil',
    icon: 'user',
    href: '/profile'
  },
  EVENTS: {
    name: 'EVENTS',
    label: 'Eventos',
    icon: 'events',
    href: '/events'
  },
  TEAMS: {
    name: 'TEAMS',
    label: 'Equipos',
    icon: 'group',
    href: '/teams'
  },
  LOGOUT: {
    name: 'LOGOUT',
    label: 'Salir',
    icon: 'logout',
    href: '/logout'
  },
  BLOG: {
    name: 'BLOG',
    label: 'Blog',
    icon: ICONS.document,
    href: '/blog'
  }
}

export const BOTTOM_LINKS = [ROUTES.PROFILE.name, ROUTES.TEAMS.name].map(
  (link) => ROUTES[link.toUpperCase()]
)

export const NAV_LINKS = [ROUTES.PROFILE.name, ROUTES.TEAMS.name, ROUTES.BLOG.name, ROUTES.LOGOUT.name,].map(
  (link) => ROUTES[link.toUpperCase()]
)
