import router from 'next/router'

export default function Button({
  label = 'label',
  type='submit',
  children,
  variant = 'primary',
  disabled = false,
  iconOnly = false,
  icon = false,
  href,
  onClick,
  size = 'md',
  fullWidth = false,
  ...rest
}) {
  const style = {
    social: 'bg-blue-500 ',
    primary: 'bg-gray-800',
    secondary: 'bg-green-500',
    disabled: 'opacity-50 shadow-none',
    danger: `bg-red-600 `
  }
  const sizing = {
    xs: `py-0 px-1`,
    sm: `py-1 px-2`,
    md: `py-2 px-4 `
  }

  return (
    <button
      onClick={(e) => {
        href ? router.push(href) : onClick ? onClick(): type
      }}
      {...rest}
      disabled={disabled}
      className={`
      items-center
      shadow-lg 
      hover:shadow-none 
      text-white 
      w-full  
      rounded-md 
      transition-colors 
      tracking-wide  
      duration-75 
      transform 
      flex 
      justify-evenly
      ${disabled ? style.disabled : ''}
      ${style[variant]}
      ${sizing[size]}
      ${fullWidth ? 'w-full' : 'min-w-min'}
      ${iconOnly && ` p-0  rounded-full w-min border`}
      `}
    >
      {children || label}
    </button>
  )
}
