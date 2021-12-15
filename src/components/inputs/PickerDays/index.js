import { dayLabels } from '@/src/utils/Dates'
import { useEffect, useState } from 'react'
import s from './styles.module.css'

export default function PickerDays({
  days = [],
  defaultDays = [],
  handleSetDays,
  disabled = false
}) {
  const [form, setForm] = useState([])
  const handleChange = ({ target: { name, checked } }) => {
    const day = parseInt(name)
    let res = []
    if (form.includes(day)) {
      let aux = form
      aux.splice(aux.indexOf(day), 1)
      res = aux
    } else {
      res = [...form, day]
    }
    setForm(res)
    handleSetDays(res)
  }

  useEffect(() => {
    setForm(days)
  }, [days])

  return (
    <div className="flex flex-wrap justify-center items-center">
      {dayLabels.map((day, i) => (
        <label
          key={i}
          className={` group flex relative h-9 w-9 justify-center items-center m-2 cursor-pointer shadow-lg hover:shadow-sm rounded-lg  ${
            disabled && `opacity-40 shadow-none cursor- cursor-not-allowed`
          }`}
        >
          <input
            checked={form.includes(i)}
            disabled={disabled}
            onChange={handleChange}
            className="absolute opacity-0 h-0 w-0 "
            // className={`${s.check_input} ${disabled && style[disabled]}`}
            name={i}
            type="checkbox"
          />
          <span className="text-2xl font-bold flex justify-center items-center rounded-lg checked-sibiling:bg-primary w-full h-full">
            {day[0]}
          </span>
        </label>
      ))}
    </div>
  )
}
