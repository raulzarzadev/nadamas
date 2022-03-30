import ICON_LIST from './icon-list'

export default function Icon({ name = '', size = 'md', ...rest }) {
  const Icon = ICON_LIST[name]

  if (Icon) {
    return <Icon size={sizign[size]} {...rest} />
  } else {
    return <span className="text-[10px] italic">Icon:{name}</span>
  }
}

const sizign = {
  xs: '1.2rem',
  sm: '1.4rem',
  md: '1.6rem',
  lg: '2rem',
  xl: '2.4rem'
}
