import s from './styles.module.css'
import Link from 'next/link'

export default function Button({
  Component,
  children,
  href,
  nextLink = false,

  // form
  outlined,
  fullwidth,
  deleteIcon = false,
  editIcon = false,
  addNew = false,
  icon = false,
  link,

  // color filled
  danger,
  success,
  primary,
  secondary,

  // decorations
  active,
  disabled,
  underline,
  ...rest
}) {
  const WrapperButton = (props) =>
    Component ? (
      <Component {...props} />
    ) : nextLink ? (
      <Link href={href}>
        <button {...props} />
      </Link>
    ) : (
      <button {...props} />
    )

  return (
    <WrapperButton
      className={s.button}
      disabled={disabled}
      fullwidth={fullwidth && 'true'}
      icon={icon ? 'true' : undefined}
      underline={underline && 'true'}
      outlined={outlined && 'true'}
      primary={primary && 'true'}
      danger={danger && 'true'}
      success={success && 'true'}
      secondary={secondary && 'true'}
      link={link && 'true'}
      {...rest}
    >
      {children}
      {underline && <div className={s.selected} />}
    </WrapperButton>
  )
}
