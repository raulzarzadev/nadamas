import React from 'react'
const Toggle = React.forwardRef(({ label = null, ...rest }, ref) => {
  return (
    <label className="label cursor-pointer w-fit">
      {label && <span className="label-text mr-1">{label}</span>}
      <input
        ref={ref}
        type="checkbox"
        className="toggle toggle-xs toggle-accent "
        {...rest}
      ></input>
    </label>
  )
})

export default Toggle
