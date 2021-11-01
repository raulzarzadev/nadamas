import { useRouter } from 'next/router'

export default function Button({
  label = 'label',
  type = 'submit',
  children,
  variant = 'primary', //| 'social' | 'secondary' | 'disabled' | 'danger'
  disabled = false,
  iconOnly = false,
  href,
  onClick,
  size = 'md',
  fullWidth = false,
  loading,
  ...rest
}) {
  const router = useRouter()
  const style = {
    social: 'bg-blue-500 ',
    primary: 'bg-blue-500',
    secondary: 'bg-green-500',
    disabled: 'opacity-50 shadow-none ',
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
        href ? router.push(href) : onClick ? onClick(e) : type
      }}
      {...rest}
      disabled={disabled || loading}
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
      {loading ? <Loading /> : children || label}
    </button>
  )
}

const Loading = () => (
  <div className="flex justify-center items-center">
    <div className="border-4 rounded-full w-7 h-7 border-t-transparent animate-spin"></div>
  </div>
)
