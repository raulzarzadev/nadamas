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
      <span className="">
        {label && value && `${label} :`}
        <div className="">
          <input
            ref={ref}
            autoComplete={autoComplete}
            type={type}
            className="p-1 bg-secondary-dark rounded-lg text-white "
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
              className=''
              onClick={(e) => {
                e.preventDefault()
                onClickIcon()
              }}
            >
              <Icon />
            </button>
          )}
        </div>
        <em className="">{error}</em>
      </span>
    )
  }
)

export default Text
