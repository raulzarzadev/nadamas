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
    <div className={s.checkboxs}>
      {dayLabels.map((day, i) => (
        <label key={i} className={s.checkbox_day}>
          <input
            disabled={disabled}
            onChange={handleChange}
            className={s.check_input}
            name={i}
            type="checkbox"
          />
          <span className={s.check_label}>{day[0]}</span>
        </label>
      ))}
    </div>
  )
}
