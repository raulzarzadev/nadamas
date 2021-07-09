import s from './styles.module.css'
import React, { useEffect, useState } from 'react'
import { HoursInput } from './HoursInput'
import { dayLabels } from '../utils/Dates'

export const Schedule = ({
  schedule,
  setSchedule,
  hideWeekend,
  userSchedule
}) => {
  const [athleteSchedule, setAthleteSchedule] = useState([])
  //const [userSchedule, setUserSchedule] = useState([])

  const handleScheduleChange = ({ target }) => {
    const { name, value } = target
    athleteSchedule[name] = value
    setAthleteSchedule([...athleteSchedule])
  }

  console.log('schedule', schedule)

  useEffect(() => {
    if (schedule) {
      setAthleteSchedule(schedule)
    }
  }, [])

/*   useEffect(() => {
    // Create a schedule fiiled with null items, and fill whit the time when the user select a new schedule
    const fillScheduleArray = setSchedule([...fillScheduleArray])
  }, [athleteSchedule]) */

  return (
    <>
      <div className={s.schedule}>
        {Object.keys(userSchedule)?.map((day, i) => (
          <div key={day}>
            {dayLabels[day]}
            <div className={s.schedule_day}>
              <select
                className={s.select_schedule}
                name={day}
                defaultValue={schedule[day]}
                onChange={handleScheduleChange}
              >
                <option value="">--:--</option>
                {userSchedule[day]?.map((hour, i) => (
                  <option key={i} value={hour}>
                    {hour}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
