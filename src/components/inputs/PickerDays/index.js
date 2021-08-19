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



  return (
    <div className="flex flex-wrap">
      {dayLabels.map((day, i) => (
        <label
          key={i}
          className={`group flex relative h-9 w-9 justify-center items-center m-2 cursor-pointer shadow-lg hover:shadow-sm ${
            disabled && `opacity-40 shadow-none cursor- cursor-not-allowed`
          }`}
        >
          <input
            disabled={disabled}
            onChange={handleChange}
            className="absolute opacity-0  h-0 w-0 checked:border-green-400"
            // className={`${s.check_input} ${disabled && style[disabled]}`}
            name={i}
            type="checkbox"
          />
          <span className={s.check_label}>{day[0]}</span>
        </label>
      ))}
    </div>
  )
}
