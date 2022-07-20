import React from 'react'

const Tooltip = React.forwardRef(({ children, element, label, side = 'top', ...props }, ref) => {
  /**
   * ! FIX tooltip make de label been on every thin like z-100 but just if is an Icon from @coms/icon
  *
  */

  const onSide = {
    top: 'tooltip-top',
    left: 'tooltip-left',
    right: 'tooltip-right',
    bottom: 'tooltip-bottom',
  }

  return (
    <div className={`tooltip hover:tooltip-open ${onSide[side]}  relative`} data-tip={label}>
      {children || element}
    </div>
  )
})
export default Tooltip
