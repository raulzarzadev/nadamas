import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Text from '../InputFields/Text'
import { dayLabels } from '../utils/Dates'
import { AddIcon, TrashBinIcon } from '../utils/Icons'
import Button from '../Button'
import PickerTime from '../PickerTime'
import PickerDays from '../PickerDays'
import s from './styles.module.css'

export default function ViewProfile() {
  const { user } = useAuth()

  // La info ser recibe asi
  const userSchedule_ex = [
    [],
    ['17:00', '18:00', '19:00'],
    ['17:00', '18:00', '19:00'],
    ['17:00'],
    ['17:00', '18:00', '19:00'],
    ['17:00', '18:00', '19:00'],
    []
  ]

  const [userSchedule, setUserSchedule] = useState(userSchedule_ex || [])

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
      day?.forEach((hour, j) => {
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
  const toUserSchedule = (schedule) => {
    let res = Array(7).fill([])
    schedule.forEach(({ hour, days }) => {
      days.forEach((day) => {
        res[day] = [...res[day], hour]
      })
      console.log('days, hour', days, hour)
    })
    console.log('res', res)

    return res
  }

  const [form, setForm] = useState({})

  useEffect(() => {
    if (user) setForm(user)
  }, [user])

  const handleChange = ({ target }) => {
    setForm({ ...form, [target.name]: target.value })
  }

  const [schedule, setSchedule] = useState({})
  const [schedules, setSchedules] = useState([])
  const handleChangeSchedule = (newSchedule) => {
    const updateSchedule = schedules.filter(
      ({ hour }) => hour !== newSchedule.hour
    )
    setSchedules([...updateSchedule, newSchedule])
  }

  useEffect(() => {
    const sortSchedules = schedules.sort((a, b) => {
      if (a.hour < b.hour) return -1
      if (a.hour > b.hour) return 1
      return 0
    })
    setScheduleDisplay(sortSchedules)
    setUserSchedule(toUserSchedule(sortSchedules))
  }, [schedules])

  const handleDeleteHour = (hour) => {
    const deleteShceduleHour = (hourToRemove) => {
      const res = scheduleDisplay.filter(({ hour }) => hourToRemove !== hour)
      
      
      return res
    }
    setSchedules(deleteShceduleHour(hour))
  }

  console.log('scheduleDisplay', scheduleDisplay)

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
          <Button onClick={() => handleDeleteHour(hour)}>
            <TrashBinIcon size={'.7rem'} />
          </Button>{' '}
          {hour}{' '}
          <div style={{ display: 'flex', width: '80%' }}>
            {days.map((day) => (
              <div
                key={day}
                style={{ margin: 4, padding: 4 }}
              >{`${dayLabels[day][0]}${dayLabels[day][1]}`}</div>
            ))}
          </div>
        </div>
      ))}
      <ScheduleSelect setSchedules={handleChangeSchedule} schedule={schedule} />
      <div>
        {/*  estadisiticas de alumnos */}
        {/* Cuantos alumnos hay */}
        {/* Cuantos por clase */}
      </div>
    </div>
  )
}

const ScheduleSelect = ({ schedule, setSchedules }) => {
  const initalFormState = { hour: '00:00', days: [] }
  const [form, setForm] = useState(initalFormState)

  const handleAddSchedule = () => {
    setSchedules(form)
    //setForm({ ...form, hour: initalFormState.hour })
  }

  const handleSetTime = (time) => {
    setForm({ ...form, hour: time })
  }
  const handleSetDays = (days) => {
    setForm({ ...form, days })
  }

  return (
    <div className={s.schedule}>
      <PickerTime
        time={form?.hour}
        minutesStep="15"
        handleSetTime={handleSetTime}
      />
      <PickerDays days={form?.days} handleSetDays={handleSetDays} />
      <Button onClick={handleAddSchedule}>
        <AddIcon />
      </Button>
    </div>
  )
}
