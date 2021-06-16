import s from './styles.module.css'
import { useEffect, useState } from "react"
import { HoursInput } from "./HoursInput"

export const Schedule = ({ form, setForm, hideWeekend }) => {
  const [schedule, setSchedule] = useState([])
  const handleChangeSchedule = (evt) => {
    const { value, name } = evt.target
    const newSchedule = schedule.map(({ day, time }) => {
      if (day == name) return { day: parseInt(name), time: value }
      return { time, day }
    })
    setForm({ ...form, schedule: newSchedule })
  }

  useEffect(() => {
    if (form.schedule) {
      setSchedule(form.schedule)
    }
  }, [form.schedule])

  const listDays = hideWeekend
    ? schedule.filter(({ day }) => day !== 0 && day !== 6)
    : schedule

  return (
    <>
      <div className={s.schedule}>
        {listDays?.map(({ day, time }) => (
          <div className={s.schedule_day}>
            <HoursInput
              name={day}
              value={time}
              onChange={handleChangeSchedule}
            />
          </div>
        ))}
      </div>
    </>
  )
}
