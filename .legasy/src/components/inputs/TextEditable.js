import { CloseBackIcon, EditIcon } from '@/legasy/src/utils/Icons'
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
      <span className='flex flex-col items-start w-full max-w-full'>
        {label && `${label} :`}
        <div className={`flex w-full`}>
          {editable ? (
            <input
              autoComplete={autoComplete}
              ref={ref}
              type={type}
              className={` bg-primary-light dark:bg-secondary-dark w-full p-1`}
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
              className={`  flex justify-center items-center border p-1 w-full rounded-md`}
            >
              {value}
              <div className="ml-2">
                <EditIcon size="1rem" />
              </div>
            </button>
          )}

          {Icon && (
            <button
              className={`m-1 p-1`}
              onClick={(e) => {
                e.preventDefault()
                onClickIcon()
              }}
            >
              <Icon />
            </button>
          )}
        </div>
        <em className={`w-full text-left text-xs`}>{error}</em>
      </span>
    )
  }
)

export default TextEditable
