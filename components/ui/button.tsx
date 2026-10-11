import type { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'subtle'
  iconOnly?: boolean
}

const variants = {
  primary: 'btn-primary',
  secondary: 'btn-outline',
  subtle: 'btn-subtle',
  ghost: 'btn-ghost',
}

export default function Button({
  variant = 'primary',
  iconOnly = false,
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`btn ${variants[variant]} ${iconOnly ? 'btn-square' : ''} ${className}`}
      {...props}
    />
  )
}
