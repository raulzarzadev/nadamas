import React from 'react'

const TextArea = React.forwardRef(
  (
    {
      placeholder = '',
      label = '',
      type = 'text',
      error = '',
      helperText = '',
      // defaultValue,
      // value,
      ...rest
    },
    ref
  ) => {
    return (
      <div className="form-control w-full max-w-xs">
        <span className="label-text capitalize-first">{label}</span>
        <textarea
          ref={ref}
          className="textarea input-bordered  w-full max-w-xs resize-none"
          placeholder={placeholder}
          type={type}
          rows={4}
          {...rest}
        />
        {helperText && (
          <span className="label-text text-info">{helperText}</span>
        )}
        {error && <span className="label-text text-error">{error}</span>}
      </div>
    )
  }
)

export default TextArea
