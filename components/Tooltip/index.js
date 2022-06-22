import React from 'react'

const Tooltip = React.forwardRef(({ element, label, ...props }, ref) => {
  /**
   * ! FIX tooltip make de label been on every thin like z-100 but just if is an Icon from @coms/icon
  *
  */
  return (
    <div className="tooltip hover:tooltip-open tooltip-top " data-tip={label}>
      {element}
    </div>
  )
})
export default Tooltip
