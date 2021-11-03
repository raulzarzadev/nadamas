import React, { useEffect, useState } from 'react'
import FormSchedule from './FormSchedule'
import { getSchedules, updateSchedule } from '@/firebase/schedules'
import Select from '@comps/inputs/Select'
import { getPublicCoachSchedules } from '@/firebase/coaches'

export default function AthleteSchedule({ athleteId }) {
  const [athleteSchedule, setAthleteSchedule] = useState({})
  const handleScheduleChange = (newSchedule) => {
    updateSchedule({
      owner: { id: athleteId },
      schedule: newSchedule
    })
      .then((res) => console.log('res', res))
      .catch((err) => console.log('err', err))
  }

  useEffect(() => {
    if (athleteId) {
      getSchedules(athleteId)
        .then(({ res }) => setAthleteSchedule(res[0]?.schedule))
        .catch((err) => console.log('err', err))
    }
  }, [athleteId])

  const [coach, setCoach] = useState(null)
  return (
    <div>
      <SelectCoach coach={coach} setCoach={setCoach} />
      <FormSchedule
        coach={coach}
        schedule={athleteSchedule}
        setSchedule={handleScheduleChange}
      />
    </div>
  )
}

const SelectCoach = ({ coach = {}, setCoach = () => {} }) => {
  const [coachesList, setCoachesList] = useState([])
  useEffect(() => {
    getPublicCoachSchedules()
      .then((res) => setCoachesList(res))
      .catch((err) => console.log(`err`, err))
    // getPublicCoaches()
    // getCoachesSchedules()
  }, [])
  const handleChangeCoach = ({ target: { value } }) => {
    const coach = coachesList.find(({ id }) => value === id)
    setCoach(coach || null)
    // setCoach(coach)
  }
  return (
    <Select
      value={coach?.id}
      label=" Horario de entrenador"
      onChange={handleChangeCoach}
      helperText="Seleccionar un entrenador te permitira saber sus horarios"
    >
      <option value="">Sin entrenador</option>
      {coachesList.map((coach) => (
        <option key={coach.id} value={coach.id}>
          {coach.name}
        </option>
      ))}
    </Select>
  )
}
