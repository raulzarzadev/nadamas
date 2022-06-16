import Icon from '@comps/Icon'
import Loading from '@comps/Loading'
import Button from '.'

export default function ButtonIcon({
  iconName,
  label,
  loading = false,
  className = '',
  //iconSize, // sm, md, lg,
  fullwidth = false,
  size,
  iconOnly,
  ...rest
}) {
  return (
    <Button
      size={size}
      className={` 
      ${fullwidth ? ' w-full ' : ' w-max '} 
      ${className} 
      ${iconOnly ? ' btn-circle btn-sm  ' : ''}
      `}
      {...rest}
    >
      {label && <span className="mr-1">{label}</span>}
      <span className="">
        {loading ? <Loading /> : <Icon name={iconName} size={size} />}
      </span>
    </Button>
  )
}
