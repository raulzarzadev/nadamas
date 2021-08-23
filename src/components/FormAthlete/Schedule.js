import s from './styles.module.css'
import React, { useEffect, useState } from 'react'
import { HoursInput } from './HoursInput'
import { dayLabels } from '../../utils/Dates'
import { getAthleteSchedule, updateAthleteSchedule } from '@/firebase/client'
import { useAuth } from '../../context/AuthContext'
import SCHEDULE_BASE from '@/src/utils/SCHEDULE_BASE'
import Select from '@comps/inputs/Select'
import Info from '@comps/Alerts/Info'

export const Schedule = ({ athleteId, athlete }) => {
  const { user } = useAuth()

  const [athleteSchedule, setAthleteSchedule] = useState({})
  const [coachSchedule, setCoachSchedule] = useState({})

  useEffect(() => {
    if (user) {
      getAthleteSchedule(user.id)
        .then((res) => setCoachSchedule(res?.schedule))
        .catch((err) => console.log('err', err))
    }
  }, [user])

  //const [userSchedule, setUserSchedule] = useState([])

  const handleScheduleChange = ({ target }) => {
    const { name, value } = target
    const newSchedule = { ...athleteSchedule, [`${name}`]: [value] }
    setAthleteSchedule(newSchedule)
    if (athleteId) {
      updateAthleteSchedule({
        athleteId,
        schedule: newSchedule,
        owner: athlete.name
      })
        .then((res) => console.log('res', res))
        .catch((err) => console.log('err', err))
    }
  }


  useEffect(() => {
    if (athleteId) {
      getAthleteSchedule(athleteId)
        .then((res) => {
          setAthleteSchedule(res?.schedule)
        })
        .catch((err) => console.log('err', err))
    }
  }, [athleteId])

  const [coachSelect, setCoachSelect] = useState('')

  useEffect(() => {
    // This effect select a user schedule as first option
    if (user) {
      setCoachSelect(user.id)
    }
  }, [user])

  const handleChangeCoach = ({ target: { name, value } }) => {
    setCoachSelect(value)
  }
  const [scheduleBase] = useState(SCHEDULE_BASE)
  const [scheduleSelected, setScheduleSlected] = useState(scheduleBase)

  useEffect(() => {
    // console.log('coachSelect', coachSelect)
    if (coachSelect === '') return setScheduleSlected(scheduleBase)
    if (coachSelect === user.id) return setScheduleSlected(coachSchedule)
  }, [coachSelect, coachSchedule])

  const areDaysEmpty = () => {
    let res = Object.keys(scheduleSelected).map((d) => {
      return scheduleSelected[d].length === 0 ? true : false
    })

    return !res.includes(false)
  }

  const emptySchedule =
    Object.keys(scheduleSelected).length === 0 || areDaysEmpty()

  return (
    <>
      <div>
        <div className="mx-1 ">
          {/*  <Info
            fullWidth
            text="Seleccionar un entrenador le ayudara a definir sus horarios"
          /> */}
          <Select
            value={coachSelect}
            label=" Horario de entrenador"
            onChange={handleChangeCoach}
            helperText="Seleccionar un entrenador te permitira saber sus horarios"
          >
            <option value="">Sin entrenador</option>
            <option value={user.id}>{user.name}</option>
          </Select>
        </div>
      </div>
      <div className={s.schedule}>
        {emptySchedule && (
          <Info text="Este entrenador no tiene horarios disponibles" />
        )}
        {!emptySchedule && (
          <div className="flex flex-col">
            {/*  <Info
              fullWidth
              text="Selecciona un horario independiente a un entrenador "
            /> */}
            <div className="flex flex-wrap justify-center">
              {Object?.keys(scheduleSelected)?.map((day, i) => (
                <label
                  key={day}
                  className="w-1/2 flex flex-col items-center sm:w-1/4 "
                >
                  {dayLabels[day]}
                  <div className="flex justify-center">
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
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
