import Icon from '@comps/Icon'
import Button from '.'

export default function ButtonIcon({ iconName, label, className, ...rest }) {
  return (
    <Button className={` ${className} btn-sm`} {...rest}>
      {label}
      <span className="ml-2">
        <Icon name={iconName} />
      </span>
    </Button>
  )
}
