import React, { useEffect, useRef, useState } from 'react'

const formatNumberInput = (value) => {
  const num = parseInt(value)
  if (!num) return ''
  return value < 1 ? '00' : value < 10 ? `0${value}` : `${value}`
}

export default function PickerRecord({
  value = null,
  setValue = (fieldName = '', value) => {},
  name = 'record',
  size = 'md'
}) {
  const formatValue = (value) => {
    if (typeof value === 'string') {
      const auxArr = value.split(/[:\.]/g)
      const minutes = auxArr[0]
      const seconds = auxArr[1]
      const ms = auxArr[2]

      return {
        minutes: parseInt(minutes),
        seconds: parseInt(seconds),
        ms: parseInt(ms)
      }
    } else {
      return { minutes: '00', seconds: '00', ms: '00' }
    }
  }

  const [form, setForm] = useState({ minutes: null, seconds: null, ms: null })

  const _handleChange = ({ target: { name, value } }) => {
    setForm({ ...form, [name]: value })
  }

  const transformRecord = ({ minutes = 0, seconds = 0, ms = 0 }) => {
    const secs = formatNumberInput(seconds)
    const mins = formatNumberInput(minutes)
    const mili = formatNumberInput(ms)
    const res = `${mins||'00'}:${secs||'00'}.${mili||'00'}`
    return res
  }

  useEffect(() => {
    transformRecord({ ...form })
    setValue(name, transformRecord({ ...form }))
  }, [form])

  useEffect(() => {
    if (value) {
      setForm(formatValue(value))
    }
  }, [value])

  //console.log(`form`, form)
  const nextInput = (nextInputName) => {
    if (nextInputName === 'minutes') return minutesRef.current.focus()
    if (nextInputName === 'seconds') return secondsRef.current.focus()
    if (nextInputName === 'ms') return msRef.current.focus()
  }
  const minutesRef = useRef(null)
  const secondsRef = useRef(null)
  const msRef = useRef(null)

  useEffect(() => {
    // TODO hacer que esto funcione
    if (minutesRef?.current) minutesRef?.current?.focus()
  }, [minutesRef])

  return (
    <div className="  flex justify-center">
      <InputNumber
        ref={minutesRef}
        name="minutes"
        label="Mins"
        onChange={_handleChange}
        value={form.minutes}
        max={99}
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
        nextInput={() => nextInput('minutes')}
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
    nextInput = () => {},
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
        className="w-full bg-primary-dark dark:bg-secondary-dark bg-opacity-20 text-center text-xl  rounded-md  flex "
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
