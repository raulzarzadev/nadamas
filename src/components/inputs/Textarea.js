import React from 'react'
import s from './styles.module.css'

const Textarea = React.forwardRef(
  (
    {
      label,
      name,
      placeholder,
      value,
      onChange,
      error,
      type = 'text',
      children,
      ...rest
    },
    ref
  ) => {
    return (
      <span className={s.input_label}>
        {label && value && `${label} :`}
        <textarea
          ref={ref}
          className={`${s.text_input} ${s.text_area}`}
          placeholder={label}
          name={name}
          value={value}
          onChange={onChange}
          {...rest}
        >
          {children}
        </textarea>
        <em>{error}</em>
      </span>
    )
  }
)
export default Textarea
