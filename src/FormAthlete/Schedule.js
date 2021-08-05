import s from './styles.module.css'
import React, { useEffect, useState } from 'react'
import { HoursInput } from './HoursInput'
import { dayLabels } from '../utils/Dates'
import { getAthleteSchedule, updateAthleteSchedule } from '@/firebase/client'

export const Schedule = ({ coachSchedule, athleteId }) => {
  const [athleteSchedule, setAthleteSchedule] = useState({})
  //const [userSchedule, setUserSchedule] = useState([])

  const handleScheduleChange = ({ target }) => {
    const { name, value } = target
    const newSchedule = { ...athleteSchedule, [`${name}`]: [value] }
    setAthleteSchedule(newSchedule)
    updateAthleteSchedule({
      athleteId,
      schedule: newSchedule
    })
      .then((res) => console.log('res', res))
      .catch((err) => console.log('err', err))
  }
  console.log('athleteSchedule', athleteSchedule)

  useEffect(() => {
    getAthleteSchedule(athleteId)
      .then(setAthleteSchedule)
      .catch((err) => console.log('err', err))
  }, [])

  return (
    <>
      <div className={s.schedule}>
        {Object.keys(coachSchedule)?.map((day, i) => (
          <div key={day}>
            {dayLabels[day]}

            <div className={s.schedule_day}>
              <select
                className={s.select_schedule}
                name={day}
                value={athleteSchedule[day]}
                onChange={handleScheduleChange}
              >
                <option value="">--:--</option>
                {coachSchedule[day]?.map((hour, i) => (
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
