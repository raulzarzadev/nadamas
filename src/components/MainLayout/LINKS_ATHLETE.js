import { PersonIcon } from "@/src/utils/Icons";

export default {
  nav: [
    {
      href: '/profile',
      label: 'Mi perfil',
      icon: ''
    },
    {
      href: '/signout',
      label: 'Salir',
      icon: ''
    }
  ],
  bottom: [
    {
      href: '/profile',
      label: 'Perfil',
      icon: <PersonIcon />
    }
  ]
}