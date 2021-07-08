import s from './styles.module.css'
import React, { useEffect, useState } from 'react'
import { HoursInput } from './HoursInput'
import { dayLabels } from '../utils/Dates'

export const Schedule = ({ schedule, setSchedule, hideWeekend }) => {
  const [athleteSchedule, setAthleteSchedule] = useState([])
  const [userSchedule, setUserSchedule] = useState([])

  const handleScheduleChange = ({ target }) => {
    const { name, value } = target
    athleteSchedule[name] = value
    setAthleteSchedule([...athleteSchedule])
  }

  useEffect(() => {
    if (schedule) {
      setAthleteSchedule(schedule)
    }
  }, [])

  useEffect(() => {
    // Create a schedule fiiled with null items, and fill whit the time when the user select a new schedule
    const fillScheduleArray = Array(7)
      .fill(null)
      .map((day, i) => (!day && athleteSchedule[i]) || null)
    setSchedule([...fillScheduleArray])
  }, [athleteSchedule])

  useEffect(() => {
    // get schedule
    const availableHours = [
      [],
      ['17:00', '18:00', '19:00'],
      ['17:00', '18:00', '19:00'],
      ['17:00', '18:00', '19:00'],
      ['17:00', '18:00', '19:00'],
      ['17:00', '18:00', '19:00'],
      []
    ]
    setUserSchedule(availableHours)
  }, [])



  return (
    <>
      <div className={s.schedule}>
        {userSchedule?.map((scheduleDay, i) => (
          <React.Fragment key={i}>
            {hideWeekend && (i === 0 || i === 6) ? null : (
              <div>
                {dayLabels[i]}
                <div className={s.schedule_day}>
                  <select
                    className={s.select_schedule}
                    name={i}
                    defaultValue={athleteSchedule[i]}
                    onChange={handleScheduleChange}
                  >
                    <option value="">--:--</option>
                    {scheduleDay?.map((hour, i) => (
                      <option key={i} value={hour}>
                        {hour}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </>
  )
}
