import { useEffect, useState } from 'react'

const formatNumberInput = (value) => {
  const num = parseInt(value)
  if (!num) return '00'
  return value < 1 ? '00' : value < 10 ? `0${value}` : `${value}`
}

export default function PickerRecord({
  value = null,
  setValue = (fieldName = '', value) => {},
  name = 'record'
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
      />
      <InputNumber
        name="seconds"
        label="Segs"
        onChange={_handleChange}
        value={form.seconds}
        max={60}
      />
      <InputNumber
        name="ms"
        label="Ms"
        onChange={_handleChange}
        value={form.ms}
        max={99}
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
  step = 1
}) => (
  <label className="flex flex-col w-16 items-center justify-center text-center m-1 ">
    {label}
    <input
      min={min}
      max={max}
      step={step}
      className="w-full bg-transparent text-center text-xl  "
      // value={formatNumberInput(value)}
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