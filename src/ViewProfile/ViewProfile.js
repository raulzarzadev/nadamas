import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Text from '../InputFields/Text'
import { dayLabels } from '../utils/Dates'
import { AddIcon } from '../utils/Icons'
import Button from '../Button'
import PickerTime from '../PickerTime'
import PickerDays from '../PickerDays'
import s from './styles.module.css'

export default function ViewProfile() {
  const { user } = useAuth()

  // La info ser recibe asi
  const userSchedule = [
    [],
    ['17:00', '18:00', '19:00'],
    ['17:00', '18:00', '19:00'],
    ['17:00'],
    ['17:00', '18:00', '19:00'],
    ['17:00', '18:00', '19:00'],
    []
  ]

  // hay que transformarla en esto
  /*   const scheduleDisplay = [
    { hour: '17:00', days: [1, 2, 3, 4, 5] },
    { hour: '18:00', days: [1, 2, 4, 5] },
    { hour: '19:00', days: [1, 2, 4, 5] }
  ] */

  const [scheduleDisplay, setScheduleDisplay] = useState([])

  useEffect(() => {
    setScheduleDisplay(toScheduleDisplay(userSchedule))
  }, [])

  const toScheduleDisplay = (schedule = []) => {
    /* 
 scanea cada dia, 
 busca si existe una propiedad hour con este valor, 
 si existe toma el valor days de esa propiedad y le agrega el index, 
 si no existe, la crea, y le agrega el index. 
 */
    let res = []
    schedule.forEach((day, i) => {
      day.forEach((hour, j) => {
        const findTime = res.find((time) => time.hour === hour)
        if (!findTime) {
          res.push({ hour, days: [i] })
        } else {
          findTime.days = [...findTime.days, i]
        }
      })
    })
    return res
  }

  const [form, setForm] = useState({})

  useEffect(() => {
    if (user) setForm(user)
  }, [user])

  const handleChange = ({ target }) => {
    setForm({ ...form, [target.name]: target.value })
  }

  const [schedules, setSchedules] = useState([])
  console.log('schedules', schedules)

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
      {scheduleDisplay.map(({ hour, days }, i) => (
        <div
          key={i}
          style={{ display: 'flex', width: '100%', alignItems: 'center' }}
        >
          {hour}{' '}
          <div style={{ display: 'flex', width: '80%' }}>
            {days.map((day) => (
              <div
                style={{ margin: 4, padding: 4 }}
              >{`${dayLabels[day][0]}${dayLabels[day][1]}`}</div>
            ))}
          </div>
        </div>
      ))}
      <ScheduleSelect setSchedules={setSchedules} schedules={schedules} />
      <div>
        {/*  estadisiticas de alumnos */}
        {/* Cuantos alumnos hay */}
        {/* Cuantos por clase */}
      </div>
    </div>
  )
}

const ScheduleSelect = ({ schedules, setSchedules }) => {
  const [form, setForm] = useState({ hour: '', days: [] })
  useEffect(() => {
    if (schedules) setForm(schedules)
  }, [schedules])
  const handleAddSchedule = () => {
    setSchedules(form)
  }

  const handleSetTime = (time) => {
    setForm({ ...form, hour: time })
  }
  const handleSetDays = (days) => {
    setForm({ ...form, days })
  }

  return (
    <div className={s.schedule}>
      <PickerTime minutesStep="15" handleSetTime={handleSetTime} />
      <PickerDays /* days={form?.days} */ handleSetDays={handleSetDays} />
      <Button onClick={handleAddSchedule}>
        <AddIcon />
      </Button>
    </div>
  )
}
