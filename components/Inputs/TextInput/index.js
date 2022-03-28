import { dateFormat } from '@/utils/dates'
import React from 'react'

const TextInput = React.forwardRef(
  (
    {
      placeholder = '',
      label = '',
      type = 'text',
      error = '',
      helperText = '',
      ...rest
    },
    ref
  ) => { 
    
    return (
      <div className="form-control w-full max-w-xs">
        <span className="label-text capitalize-first">{label}</span>
        <input
          ref={ref}
          className="input input-bordered input-xs w-full max-w-xs"
          placeholder={placeholder}
          type={type}
          {...rest}
        />
        {helperText && <span className="label-text text-info">{helperText}</span>}
        {error && <span className="label-text text-error">{error}</span>}
      </div>
    )
  }
)

export default TextInput
