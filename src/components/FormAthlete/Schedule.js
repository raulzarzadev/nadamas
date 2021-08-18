import s from './styles.module.css'
import React, { useEffect, useState } from 'react'
import { HoursInput } from './HoursInput'
import { dayLabels } from '../../utils/Dates'
import { getAthleteSchedule, updateAthleteSchedule } from '@/firebase/client'
import { useAuth } from '../../context/AuthContext'
import SCHEDULE_BASE from '@/src/utils/SCHEDULE_BASE'
import Select from '@comps/inputs/Select'

export const Schedule = ({ athleteId, athlete }) => {
  const { userSchedule, user } = useAuth()

  const [athleteSchedule, setAthleteSchedule] = useState({})
  const [coachSchedule, setCoachSchedule] = useState({})

  useEffect(() => {
    if (userSchedule.schedule) setCoachSchedule(userSchedule.schedule)
  }, [userSchedule])

  console.log(athleteSchedule)

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

  const [coachSelect, setCoachSelect] = useState('')

  const handleChangeCoach = ({ target: { name, value } }) => {
    setCoachSelect(value)
  }
  const [scheduleBase] = useState(SCHEDULE_BASE)
  const [scheduleSelected, setScheduleSlected] = useState(scheduleBase)

  useEffect(() => {
    console.log('coachSelect', coachSelect)
    if (coachSelect === '') return setScheduleSlected(scheduleBase)
    if (coachSelect === user.id) return setScheduleSlected(coachSchedule)
  }, [coachSelect])

  return (
    <>
      <div>
        <div className="mx-1">
          <Select label=" Horario de entrenador" onChange={handleChangeCoach}>
            <option value="">Sin entrenador</option>
            <option value={user.id}>{user.name}</option>
          </Select>
        </div>
      </div>
      <div className={s.schedule}>
        {Object?.keys(scheduleSelected)?.map((day, i) => (
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
                {scheduleSelected[day]?.map((hour, i) => (
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
