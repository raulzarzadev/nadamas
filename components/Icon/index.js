import ICON_LIST from './icon-list'

export default function Icon({ name = '', size = 'md', ...rest }) {
  /*   const Icon = ICON_LIST[name] || <>icon</>

  if (!Icon) return name
  return <Icon size={sizign[size]} {...rest} /> */
  return name
}

const sizign = {
  sm: '1rem',
  md: '1.4rem',
  lg: '2rem'
}
