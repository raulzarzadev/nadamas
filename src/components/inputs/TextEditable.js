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
    const click = useSingleAndDoubleClick(
      () => setEditable(false),
      () => {
        if (permissionToEdit) {
          setEditable(true)
        }
      }

      // solo si userId === athleta
    )
    return (
      <span className={s.input_label}>
        {label && `${label} :`}
        <div className={s.icon_container}>
          {editable ? (
            <input
              autoComplete={autoComplete}
              ref={ref}
              type={type}
              className={s.text_input}
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
              className={`${s.text_input} ${s.text_input_not_editable} flex justify-center items-center`}
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

function useSingleAndDoubleClick(
  actionSimpleClick,
  actionDoubleClick,
  delay = 250
) {
  const [click, setClick] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      // simple click
      if (click === 1) actionSimpleClick()
      setClick(0)
    }, delay)

    // the duration between this click and the previous one
    // is less than the value of delay = double-click
    if (click === 2) actionDoubleClick()

    return () => clearTimeout(timer)
  }, [click])

  return () => setClick((prev) => prev + 1)
}

export default TextEditable
