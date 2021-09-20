import { useEffect, useState } from 'react'

export default function PickerRecord({ handleChange = () => {}, value = {} }) {
  const [form, setForm] = useState({ minutes: '00', seconds: '00', ms: '000' })

  const _handleChange = ({ target: { name, value } }) => {
    setForm({ ...form, [name]: value })
  }

  useEffect(() => {
    const secs =
      form.seconds == ''
        ? '00'
        : form.seconds < 9
        ? `0${form.seconds}`
        : form.seconds
    const mins =
      form.minutes == ''
        ? '00'
        : form.minutes < 9
        ? `0${form.minutes}`
        : form.minutes
    const ms = form.ms < 1 ? '000' : form.ms < 9 ? `0${form.ms}` : form.ms
    handleChange(`${mins}:${secs}.${ms}`)
  }, [form])
  console.log(form)

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
          placeholder="00"
          type="number"
          pattern="[0-9]*"
          inputMode="numeric"
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
          placeholder="00"
          type="number"
          pattern="[0-9]*"
          inputMode="numeric"
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
          placeholder="000"
          type="number"
          pattern="[0-9]*"
          inputMode="numeric"
        />
      </label>
    </div>
  )
}
