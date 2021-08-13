export default function Button({
  label = 'label',
  children,
  variant = 'primary',
  disabled=false,
  ...rest
}) {
  const style = {
    social: 'bg-blue-500  hover:bg-blue-400 focus:bg-blue-400',
    primary:
      'bg-gray-700 hover:bg-gray-600 focus:outline-none focus:bg-gray-600',
    disabled: 'opacity-50 '
  }
  return (
    <button
      {...rest}
      disabled={disabled}
      className={`
      ${disabled && style.disabled}
       ${style[variant]}
        w-full px-4 py-2 tracking-wide text-white transition-colors duration-200 transform  rounded-md   `}
    >
      {children || label}
    </button>
  )
}
