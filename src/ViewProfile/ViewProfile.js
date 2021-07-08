import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Text from '../InputFields/Text'
import { dayLabels } from '../utils/Dates'
import { AddIcon, TrashBinIcon } from '../utils/Icons'
import Button from '../Button'
import PickerTime from '../PickerTime'
import PickerDays from '../PickerDays'
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

  /* const handleSetUserSchedule = (schedule) => {
    const toScheduleUserFormat = (schedule = []) => {
      let res = {}
      schedule.forEach(({ day, hour }) => {
        if (!res[day]) {
          res[day] = [hour]
        } else {
          res[day].push(hour)
        }
      })

      console.log('res', res)
    }
    toScheduleUserFormat(schedule)
  }
  //setForm({ ...form, schedule })
  console.log('form', form) */

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
