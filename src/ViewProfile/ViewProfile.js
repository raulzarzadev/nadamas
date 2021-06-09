import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import FormUser from '../FormUser'
import Text from '../InputFields/Text'
import { dayLabels } from '../utils/Dates'
import s from './styles.module.css'

export default function ViewProfile() {
  const { user } = useAuth()

  const [form, setForm] = useState({})

  useEffect(() => {
    if (user) setForm(user)
  }, [user])

  const onChangeSchedule = (e) => {
    console.log('change schedule', e.target.value, e.target.checked)
  }

  const [hideWeekend, setHideWeekend] = useState(true)

  return (
    <div className={s.viewprofile}>
      <div>
        <Text label="Nombre" value={form.name} name="name" />
      </div>
      <div>
        <Text label="Correo" value={form.email} name="email" />
      </div>
      <h3>Horarios disponibles</h3>
      <ScheduleSelect
        schedule={user?.schedule}
        onChangeSchedule={onChangeSchedule}
        hideWeekend={hideWeekend}
      />
      <div>
        {/*  estadisiticas de alumnos */}
        {/* Cuantos alumnos hay */}
        {/* Cuantos por clase */}
      </div>
    </div>
  )
}

const ScheduleSelect = ({ schedule, onChangeSchedule, hideWeekend }) => {
  const hours = []
  for (let i = 5; i < 22; i++) {
    hours.push({ value: `${i}`, label: `${i < 10 ? `0${i}` : i}:00` })
  }
  const [form, setForm] = useState({
    day: new Date().getDay(),
    times: [new Date().getHours()]
  })
  useEffect(() => {}, [schedule])

  const onChange = (e) => {
    const { name, value, checked } = e.target
    if (name === 'day' && !form.times.includes(parseInt(value))) {
      setForm({ ...form, day: value, times: [...form?.times, parseInt(value)] })
    }
    e.target.name
    console.log('e', e.target.value, e.target.name, e.target.checked)
  }
  console.log('form', form)

  /* 
  {day:1,
  times:[17,18,19,]}
  */

  const scheduleDisplay = form.times

  return (
    <div className={s.schedule}>
      <select name="day" className={s.select} onChange={onChange} value={null}>
        <option value={null}>--:--</option>
        {hours.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <div className={s.checkboxs}>
        {dayLabels.map((day, i) => (
          <label className={s.checkbox_day}>
            <input
              onChange={onChange}
              className={s.check_input}
              name={i}
              type="checkbox"
            />
            <span className={s.check_label}>{day[0]}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
