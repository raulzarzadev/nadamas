import { useEffect, useState } from 'react'
import { dayLabels } from '../utils/Dates'
import s from './styles.module.css'

export default function PickerDays({ days = [], handleSetDays }) {
  const [form, setForm] = useState([])

  const handleChange = ({ target: { name, checked } }) => {
    const day = parseInt(name)
    if (checked) {
      if (!form.includes(day)) setForm([...form, day])
    } else {
      setForm(form.filter((item) => item !== day))
    }
  }

  useEffect(() => {
    setForm(days)
  }, [days])

  useEffect(() => {
    handleSetDays(form)
  }, [form])

  return (
    <div className={s.checkboxs}>
      {dayLabels.map((day, i) => (
        <label key={i} className={s.checkbox_day}>
          <input
            onChange={handleChange}
            className={s.check_input}
            name={i}
            checked={form.includes(i)}
            type="checkbox"
          />
          <span className={s.check_label}>{day[0]}</span>
        </label>
      ))}
    </div>
  )
}
