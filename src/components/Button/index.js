export default function Button({
  label = 'label',
  children,
  variant = 'primary',
  disabled = false,
  ...rest
}) {
  const style = {
    social: 'bg-blue-500 ',
    primary: 'bg-gray-700',
    disabled: 'opacity-50 ',
    danger: `bg-red-600 `
  }

  return (
    <button
      {...rest}
      disabled={disabled}
      className={`
      opacity-90 shadow-lg hover:shadow-none  hover:opacity-100 focus:opacity-100  text-white w-full px-4 py-2 rounded-md transition-colors tracking-wide  duration-75 transform 
      ${disabled && style.disabled}
      ${style[variant]}
      `}
    >
      {children || label}
    </button>
  )
}
