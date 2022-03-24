import ICON_LIST from './icon-list'

export default function Icon({ name = '', size = 'md', ...rest }) {
  const Icon = ICON_LIST[name]

  if (Icon) {
    return <Icon size={sizign[size]} {...rest} />
  } else {
    return <span className='text-[10px] italic'>Icon:{name}</span>
  }

}

const sizign = {
  sm: '1rem',
  md: '1.4rem',
  lg: '2rem'
}
