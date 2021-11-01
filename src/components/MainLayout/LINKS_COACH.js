import { GroupsIcon, PersonIcon } from '@/src/utils/Icons'

export default {
  nav: [
    {
      href: '/profile',
      label: 'Mi perfil',
      icon: ''
    },
    {
      href: '/groups',
      label: 'Mis grupos',
      icon: ''
    },
    {
      href: '/teams',
      label: 'Mis equipos',
      icon: ''
    },
    {
      href: '/athletes',
      label: 'Atletas',
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
