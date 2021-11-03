import React, { useEffect, useState } from 'react'
import FormSchedule from './FormSchedule'
import { getSchedules, updateSchedule } from '@/firebase/schedules'
import Select from '@comps/inputs/Select'
import { getPublicCoachSchedules } from '@/firebase/coaches'
import Button from '@comps/inputs/Button'

export default function AthleteSchedule({ athleteId }) {
  const handleScheduleChange = (newSchedule) => {
    setIsDirty(true)
    setForm({ ...form, schedule: newSchedule })
  }
  const [form, setForm] = useState({ owner: { id: athleteId } })

  useEffect(() => {
    if (athleteId) {
      getSchedules(athleteId)
        .then(({ res }) => {
          setForm({ ...res[0] })
        })
        .catch((err) => console.log('err', err))
    }
  }, [athleteId])

  const [coach, setcoach] = useState(null)
  const handleSetCoach = (coach) => {
    setIsDirty(true)
    setcoach(coach)
    setForm({
      ...form,
      coach: { id: coach?.id || null, name: coach?.name || null }
    })
  }

  const [isDirty, setIsDirty] = useState(false)
  const handleSubmit = () => {
    updateSchedule({
      ...form
    })
      .then((res) => {
        setIsDirty(false)
      })
      .catch((err) => console.log('err', err))
  }
  console.log(`form`, form)
  return (
    <div>
      {isDirty && <Button onClick={handleSubmit}>Actualizar</Button>}
      <SelectCoach coach={form?.coach} setCoach={handleSetCoach} />
      <FormSchedule
        coach={coach}
        schedule={form?.schedule}
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
