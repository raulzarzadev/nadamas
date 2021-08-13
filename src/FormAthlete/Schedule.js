import s from './styles.module.css'
import React, { useEffect, useState } from 'react'
import { HoursInput } from './HoursInput'
import { dayLabels } from '../utils/Dates'
import { getAthleteSchedule, updateAthleteSchedule } from '@/firebase/client'
import { useAuth } from '../context/AuthContext'

export const Schedule = ({ athleteId, athlete }) => {
  const { userSchedule } = useAuth()

  const [athleteSchedule, setAthleteSchedule] = useState({})
  const [coachSchedule, setCoachSchedule] = useState({})

  useEffect(() => {
    if (userSchedule.schedule) setCoachSchedule(userSchedule.schedule)
  }, [userSchedule])
  //const [userSchedule, setUserSchedule] = useState([])

  const handleScheduleChange = ({ target }) => {
    const { name, value } = target
    const newSchedule = { ...athleteSchedule, [`${name}`]: [value] }
    setAthleteSchedule(newSchedule)
    updateAthleteSchedule({
      athleteId,
      schedule: newSchedule,
      owner: athlete.name
    })
      .then((res) => console.log('res', res))
      .catch((err) => console.log('err', err))
  }

  useEffect(() => {
    if (athleteId) {
      getAthleteSchedule(athleteId)
        .then((res) => {
          setAthleteSchedule(res.schedule)
        })
        .catch((err) => console.log('err', err))
    }
  }, [athleteId])

  return (
    <>
      <div className={s.schedule}>
        {Object?.keys(coachSchedule)?.map((day, i) => (
          <div key={day}>
            {dayLabels[day]}

            <div className={s.schedule_day}>
              <select
                className={s.select_schedule}
                name={day}
                value={athleteSchedule ? athleteSchedule[day] : ''}
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
