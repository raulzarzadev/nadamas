
import React, { useEffect, useRef, useState } from 'react'
import formatNumberInput from './formatNumberInput'
import formatRecord from './formatRecord'
import transformRecord from './transformRecord'



export default function PickerRecord({
  value = null,
  setValue = (fieldName = '', value) => { },
  name = 'record',
  size = 'md',
  includeHours = false,
  inMilliseconds = true
}) {
  
  const [form, setForm] = useState(formatRecord(value))

  const _handleChange = ({ target: { name, value } }) => {
    setForm({ ...form, [name]: value })
  }

  useEffect(() => {
    setValue(name, transformRecord({ ...form }, { inMilliseconds }))
  }, [form])

  const nextInput = (nextInputName) => {
    if (nextInputName === 'hours') return hoursRef?.current?.focus()
    if (nextInputName === 'minutes') return minutesRef?.current?.focus()
    if (nextInputName === 'seconds') return secondsRef?.current?.focus()
    if (nextInputName === 'ms') return msRef?.current?.focus()
  }
  
  const hoursRef = useRef(null)
  const minutesRef = useRef(null)
  const secondsRef = useRef(null)
  const msRef = useRef(null)

  useEffect(() => {
    // TODO hacer que esto funcione
    if (minutesRef?.current) minutesRef?.current?.focus()
  }, [minutesRef])


  return (
    <div className="  flex justify-center">
      {includeHours &&
        <InputNumber
          ref={hoursRef}
          name="hours"
          label="Hrs"
          onChange={_handleChange}
          value={form.hours}
          max={24}
          size={size}
          nextInput={() => nextInput('minutes')}
        />
      }
      <InputNumber
        ref={minutesRef}
        name="minutes"
        label="Mins"
        onChange={_handleChange}
        value={form.minutes}
        max={60}
        size={size}
        nextInput={() => nextInput('seconds')}
      />
      <InputNumber
        ref={secondsRef}
        name="seconds"
        label="Segs"
        onChange={_handleChange}
        value={form.seconds}
        max={60}
        nextInput={() => nextInput('ms')}
        size={size}
      />
      <InputNumber
        ref={msRef}
        name="ms"
        label="Ms"
        onChange={_handleChange}
        value={form.ms}
        max={99}
        maxLength={3}
        nextInput={() => nextInput(includeHours ? 'hours' : 'minutes')}
        size={'lg'}
      />
    </div>
  )
}

const InputNumber = React.forwardRef((props, ref) => {
  const {
    label,
    onChange,
    value,
    name,
    max,
    min = 0,
    step = 1,
    size,
    maxLength = 2,
    nextInput = () => { },
    ...rest
  } = props
  const sizing = {
    sm: 'w-12 p-1  text-sm',
    md: 'w-16 m-1 text-sm',
    lg: 'w-18 p-1 text-sm'
  }
  return (
    <label
      className={`${sizing[size]} flex flex-col items-center justify-center text-center`}
    >
      <span>{label}</span>
      <input
        ref={ref}
        min={min}
        max={max}
        step={step}
        className="w-full bg-primary-dark dark:bg-secondary-dark bg-opacity-20 text-center text-xl rounded-md flex "
        onBlur={(e) => {
          e.target.value = ''
        }}
        onChange={onChange}
        name={name}
        placeholder={formatNumberInput(value)}
        type="number"
        pattern="[0-9]*"
        inputMode="numeric"
        maxLength={maxLength}
        onKeyUp={(e) => {
          const length = e.target.value.length
          const maxLength = e.target.maxLength
          if (length >= maxLength) {
            nextInput()
          }
        }}
        {...rest}
      />
    </label>
  )
})
