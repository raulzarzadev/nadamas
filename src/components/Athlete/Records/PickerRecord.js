import { useEffect, useState } from 'react'

const formatNumberInput = (value) => {
  const num = parseInt(value)
  if (!num) return '00'
  return value < 1 ? '00' : value < 10 ? `0${value}` : `${value}`
}

export default function PickerRecord({
  value = null,
  setValue = (fieldName = '', value) => {},
  name = 'record',
  size = 'md'
}) {
  console.log(`value`, value)
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
    console.log(`form[name]`, form[name])
    setForm({ ...form, [name]: value })
  }

  const transformRecord = ({ minutes = 0, seconds = 0, ms = 0 }) => {
    const secs = formatNumberInput(seconds)
    const mins = formatNumberInput(minutes)
    const mili = formatNumberInput(ms)
    const res = `${mins}:${secs}.${mili}`
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

  return (
    <div className="  flex justify-center">
      <InputNumber
        name="minutes"
        label="Mins"
        onChange={_handleChange}
        value={form.minutes}
        max={99}
        size={size}
      />
      <InputNumber
        name="seconds"
        label="Segs"
        onChange={_handleChange}
        value={form.seconds}
        max={60}
        size={size}
      />
      <InputNumber
        name="ms"
        label="Ms"
        onChange={_handleChange}
        value={form.ms}
        max={99}
        size={size}
      />
    </div>
  )
}

const InputNumber = ({
  label,
  onChange,
  value,
  name,
  max,
  min = 0,
  step = 1,
  size
}) => {
  const sizing = {
    sm: 'w-12 p-1  text-sm',
    md: 'w-16 m-1 ',
    lg: ''
  }
  console.log(`value`, formatNumberInput(value))
  return (
    <label
      className={`${sizing[size]} flex flex-col items-center justify-center text-center`}
    >
      <span>{label}</span>
      <input
        min={min}
        max={max}
        step={step}
        className="w-full bg-transparent text-center text-xl  "
        value={formatNumberInput(value)}
        onChange={onChange}
        name={name}
        // defaultValue={formatNumberInput(value)}
        placeholder={formatNumberInput(value)}
        type="number"
        pattern="[0-9]*"
        inputMode="numeric"
      />
    </label>
  )
}
