import { useEffect, useState } from 'react'

export default function PickerRecord({ handleChange = () => {}, value = {} }) {
  const [form, setForm] = useState({ minutes: 0, seconds: 0, ms: 0 })

  const _handleChange = ({ target: { name, value } }) => {
    setForm({ ...form, [name]: value })
  }

  useEffect(() => {
    const secs =
      form.seconds === 0
        ? '00'
        : form.seconds < 9
        ? `0${form.seconds}`
        : form.seconds
    const mins =
      form.minutes === 0
        ? '00'
        : form.minutes < 9
        ? `0${form.minutes}`
        : form.minutes
    const ms = form.ms < 1 ? '000' : form.ms < 9 ? `0${form.ms}` : form.ms
    handleChange(`${mins}:${secs}.${ms}`)
  }, [form])

  return (
    <div className="  flex justify-center">
      <label className="flex flex-col w-14 items-center">
        Min
        <input
          min={0}
          max={100}
          className="w-full p-2 bg-transparent text-center text-2xl"
          value={value?.minutes}
          onChange={_handleChange}
          name="minutes"
          type="tel"
          placeholder="00"
        />
      </label>

      <label className="flex flex-col w-14 items-center">
        Seg
        <input
          min={0}
          max={60}
          className="w-full p-2 bg-transparent text-center text-2xl"
          value={value?.seconds}
          onChange={_handleChange}
          name="seconds"
          type="tel"
          placeholder="00"
        />
      </label>
      <label className="flex flex-col w-16 items-center">
        Ms
        <input
          min={0}
          max={100}
          className="w-full p-2 bg-transparent text-center text-2xl max-w-xs min-w-min"
          value={value?.ms}
          onChange={_handleChange}
          name="ms"
          type="tel"
          placeholder="000"
        />
      </label>
    </div>
  )
}
