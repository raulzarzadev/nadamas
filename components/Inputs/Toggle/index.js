import React from 'react'
const Toggle = React.forwardRef(({ label = null, size = 'xs', ...rest }, ref) => {
  const sizing = {
    lg: 'toggle-lg',
    md: 'toggle-md',
    sm: 'toggle-sm',
    xs: 'toggle-xs',
  }
  return (
    <label className="label cursor-pointer w-fit ">
      {label && <span className="label-text mr-1 whitespace-nowrap">{label}</span>}
      <input
        ref={ref}
        type="checkbox"
        className={`
        ${sizing[rest.size]}
        toggle  toggle-accent `}
        {...rest}
      ></input>
    </label>
  )
})

export default Toggle
