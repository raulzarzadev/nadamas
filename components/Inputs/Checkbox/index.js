import React from 'react'

const Checkbox = React.forwardRef((props, ref) => {
  const { label, labelPosition = 'top' } = props
  const POSITION = {
    top: 'flex flex-col ',
    bottom: 'flex flex-col-reverse ',
    left: 'flex',
    rigth: 'flex flex-reverse'
  }
  return (
    <div className="form-control">
      <label className={`cursor-pointer  label ${POSITION[labelPosition]}`}>
        <span className="label-text m-1 whitespace-nowrap">{label}</span>
        <input ref={ref} type="checkbox" className="checkbox checkbox-primary" {...props} />
      </label>
    </div>
  )
})

export default Checkbox
