import { CloseBackIcon } from '@/src/utils/Icons'
import React from 'react'
import s from './styles.module.css'

const Text = React.forwardRef(
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
      Icon,
      autoComplete,
      onClickIcon,
      ...rest
    },
    ref
  ) => {
    return (
      <span className={s.input_label}>
        {label && value && `${label} :`}
        <div className={s.icon_container}>
          <input
            ref={ref}
            autoComplete={autoComplete}
            type={type}
            className={s.text_input}
            placeholder={placeholder || label}
            name={name}
            value={value || ''}
            onChange={onChange}
            {...rest}
          >
            {children}
          </input>
          {Icon && (
            <button
              className={s.icon}
              onClick={(e) => {
                e.preventDefault()
                onClickIcon()
              }}
            >
              <Icon />
            </button>
          )}
        </div>
        <em className={s.input_error}>{error}</em>
      </span>
    )
  }
)

export default Text
