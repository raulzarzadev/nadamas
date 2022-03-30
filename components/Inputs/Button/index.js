export default function Button({
  children,
  className,
  size = 'sm',
  rounded,
  circle,
  variant,
  label,
  ...props
}) {
  const sizign = {
    xs: 'btn-xs',
    sm: 'btn-sm',
    md: 'btn-md',
    lg: 'btn-lg'
  }
  const variants = {
    outline: 'btn-outline',
    circle: 'btn-circle',
    rounded: 'rounded-full'
  }
  return (
    <button
      className={`btn 
     ${className} 
     ${sizign[size]}
     ${variants[variant]}
      ${rounded && ' rounded-full '}
      ${circle && ' btn-circle '}
      `}
      {...props}
    >
      {label || children || 'Button'}
    </button>
  )
}
