import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Text from '../InputFields/Text'
import s from './styles.module.css'
import { updateUser } from '@/firebase/client'
import ScheduleForm from '../ScheduleForm'

export default function ViewProfile() {
  const { user } = useAuth()
  if (!user) return 'Cargando ...'

  const [form, setForm] = useState({})

  const handleChange = ({ target: { value, name } }) => {
    setForm({ ...form, [name]: value })
  }

  useEffect(() => {
    if (user) {
      setForm(user)
    }
  }, [user])
  /* De esto */

  const schedulUserFormat = [{ days: [1, 2], hour: '18:00' }]
  /* a esto */
  const scheduleDisplayFormat = { 1: ['18:00'] }

  const handleSetUserSchedule = (schedule = []) => {
    /* Pasar de chedule array a schedule object para guardarlo*/

    updateUser({ ...form, schedule: toScheduleObject(schedule) })
  }

 
  return (
    <div className={s.viewprofile}>
      <div>
        <Text
          label="Nombre"
          value={form.name}
          onChange={handleChange}
          name="name"
        />
      </div>

      <div>
        <Text
          label="Correo"
          value={form.email}
          onChange={handleChange}
          name="email"
        />
      </div>
      <h3>Horarios disponibles</h3>
      <ScheduleForm
        schedule={toScheduleArray(form.schedule)}
        setSchedule={handleSetUserSchedule}
      />
      <div>
        {/*  estadisiticas de alumnos */}
        {/* Cuantos alumnos hay */}
        {/* Cuantos por clase */}
      </div>
    </div>
  )
}
const toScheduleObject = (schedule = []) => {
  let res = {}
  schedule.forEach(({ days, hour }) => {
    days.forEach((day) => {
      res[day] ? res[day].push(hour) : (res[day] = [hour])
    })
  })
  return res
}
const toScheduleArray = (schedule = {}) => {
  let res = []

  for (let day in schedule) {
    const numDay = parseInt(day)
    schedule[numDay].forEach((hour) => {
      const time = res.find((r) => r.hour === hour)
      time
        ? (time.days = [...time.days, numDay])
        : res.push({ hour, days: [numDay] })
    })
  }
  return res
}
