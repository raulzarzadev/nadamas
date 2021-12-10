import { CloseBackIcon, EditIcon } from '@/src/utils/Icons'
import React from 'react'
import s from './styles.module.css'

import { useState, useEffect } from 'react'

const TextEditable = React.forwardRef(
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
      permissionToEdit = true,
      ...rest
    },
    ref
  ) => {
    const [editable, setEditable] = useState(false)
    const click = () => {
      setEditable(true)
    }

    // solo si userId === athleta
    return (
      <span className={s.input_label}>
        {label && `${label} :`}
        <div className={s.icon_container}>
          {editable ? (
            <input
              autoComplete={autoComplete}
              ref={ref}
              type={type}
              className={` bg-primary-light dark:bg-secondary-dark w-full `}
              placeholder={placeholder || label}
              name={name}
              value={value || ''}
              onChange={onChange}
              autoFocus={true}
              onBlur={() => setEditable(false)}
              {...rest}
            >
              {children}
            </input>
          ) : (
            <button
              onClick={(e) => {
                e.preventDefault()
                click()
              }}
              className={`  flex justify-center items-center w-full `}
            >
              {value}
              <div className="ml-2">
                <EditIcon size="1rem" />
              </div>
            </button>
          )}

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

export default TextEditable
