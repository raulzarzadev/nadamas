export default function Button({
  children,
  className,
  size = 'sm',
  rounded,
  circle,
  label,
  ...props
}) {
  const sizign = {
    xs: 'btn-xs',
    sm: 'btn-sm',
    md: 'btn-md',
    lg: 'btn-lg'
  }
  return (
    <button
      className={`btn
     ${className} 
     ${sizign[size]}
      ${rounded && ' rounded-full '}
      ${circle && ' btn-circle '}
      `}
      {...props}
    >
      {label || children || 'Button'}
    </button>
  )
}
