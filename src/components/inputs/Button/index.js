import { useRouter } from 'next/router'

export default function Button({
  label = 'label',
  type = 'submit',
  children,
  variant = 'primary', //| 'social' | 'secondary' | 'disabled' | 'danger' | 'outlined'
  disabled = false,
  iconOnly = false,
  href,
  onClick,
  size = 'md',
  fullWidth = false,
  loading,
  noWrapText,
  ...rest
}) {
  const router = useRouter()
  const style = {
    social: 'bg-primary dark:bg-secondary text-dark dark:text-light ',
    primary: 'bg-primary',
    secondary: 'bg-secondary',
    success: 'bg-success text-dark',
    disabled: 'opacity-50 shadow-none ',
    danger: `bg-danger `,
    outlined: ' border border-primary border-opacity-40'
  }
  const sizing = {
    xs: `py-0 px-0.5`,
    sm: `py-1 px-2`,
    md: `py-2 px-4 `,
    lg: 'py-2 px-6'
  }

  return (
    <button
      onClick={(e) => {
        href ? router.push(href) : onClick ? onClick(e) : type
      }}
      {...rest}
      disabled={disabled || loading}
      className={`
      uppercase
      px-1
      items-center
      shadow-lg 
      hover:shadow-none 
      w-full  
      rounded-md 
      transition-colors 
      tracking-wide  
      duration-75 
      transform 
      flex 
      justify-evenly
      text-sm
      mx-auto
      ${noWrapText && 'whitespace-nowrap'}
      
      ${disabled ? style.disabled : ''}
      ${style[variant]}
      ${sizing[size]}
      ${fullWidth ? 'w-full' : 'w-min'}
      ${iconOnly && ` p-0  rounded-full w-min border`}
      `}
    >
      {loading ? <Loading /> : children || label}
    </button>
  )
}

const Loading = () => (
  <div className="flex justify-center items-center">
    <div className="border-8 rounded-full w-7 h-7 border-t-0 border-b-0  border-r-0 animate-spin"></div>
  </div>
)
