import router from 'next/router'

export default function Button({
  label = 'label',
  children,
  variant = 'primary',
  disabled = false,
  iconOnly = false,
  icon = false,
  href,
  onClick,
  size = 'md',
  ...rest
}) {
  const style = {
    social: 'bg-blue-500 ',
    primary: 'bg-gray-700',
    secondary: 'bg-green-500',
    disabled: 'opacity-50 shadow-none',
    danger: `bg-red-600 `
  }
  const sizing = {
    xs: `p-0`,
    sm: `p-1`,
    md: ` px-4 py-2 `
  }

  return (
    <button
      onClick={() => {
        href ? router.push(href) : onClick()
      }}
      {...rest}
      disabled={disabled}
      className={`
      z-10
       shadow-lg hover:shadow-none text-white w-full  rounded-md transition-colors tracking-wide  duration-75 transform flex justify-evenly
      ${disabled ? style.disabled : ''}
      ${style[variant]}
      ${sizing[size]}
      ${iconOnly && ` p-0  rounded-full w-min border`}
      `}
    >
      {children || label}
    </button>
  )
}
