import ICON_LIST from './icon-list'

export default function Icon({ name = '', size = 'md', ...rest }) {
  const Icon = ICON_LIST[name]

  if (Icon) {
    return <Icon   size={sizign[size]} {...rest} />
  } else {
    return <span className="text-[10px] italic">Icon:{name}</span>
  }
}

const SIZE = 25

const sizign = {
  xs: `${SIZE * 0.85}px`,
  sm: `${SIZE * 0.92}px`,
  md: `${SIZE * 1}px`,
  lg: `${SIZE * 1.2}px`,
  xl: `${SIZE * 1.4}px`
}
