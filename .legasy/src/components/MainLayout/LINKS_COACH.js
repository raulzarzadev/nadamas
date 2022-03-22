import { GroupsIcon, PersonIcon } from '@/legasy/src/utils/Icons'

export default {
  nav: [
    {
      href: '/profile',
      label: 'Mi perfil',
      icon: ''
    },
    {
      href: '/events',
      label: 'Eventos',
      icon: ''
    },
    {
      href: '/teams',
      label: 'Equipos',
      icon: ''
    },
    {
      href: '/groups',
      label: 'Mis grupos',
      icon: ''
    },
    {
      href: '/athletes',
      label: 'Mis atletas',
      icon: ''
    },
    ,
    /* {
      href: '/athletes/new',
      label: 'Nuevo atleta',
      icon: ''
    }, */
    /*  {
      href: '/records',
      label: 'Registros',
      icon: ''
    }, */
    {
      href: '/signout',
      label: 'Salir',
      icon: ''
    }
  ],
  bottom: [
    {
      href: '/groups',
      label: 'Grupos',
      icon: <GroupsIcon />
    },
    {
      href: '/athletes',
      label: 'Nadadores',
      icon: <PersonIcon />
    }
  ]
}
