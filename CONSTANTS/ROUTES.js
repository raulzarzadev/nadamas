export const ROUTES = {
  PROFILE: {
    label: 'Perfil',
    icon: 'user',
    href: '/profile'
  },
  EVENTS: {
    label: 'Eventos',
    icon: 'events',
    href: '/events'
  },
  TEAMS: {
    label: 'Equipos',
    icon: 'group',
    href: '/teams'
  },
  LOGOUT: {
    label: 'Salir',
    icon: 'logout',
    href: '/logout'
  }
}

export const BOTTOM_LINKS = ['profile', 'teams'].map(
  (link) => ROUTES[link.toUpperCase()]
)

export const NAV_LINKS = ['profile', 'teams', 'logout'].map(
  (link) => ROUTES[link.toUpperCase()]
)
