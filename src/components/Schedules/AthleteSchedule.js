import React, { useEffect, useState } from 'react'
import FormSchedule from './FormSchedule'
import { getSchedules, updateSchedule } from '@/firebase/schedules'
import Select from '@comps/inputs/Select'
import { getPublicCoachSchedules } from '@/firebase/coaches'
import Button from '@comps/inputs/Button'
import { useAuth } from '@/src/context/AuthContext'

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

  const [coach, setCoach] = useState(null)
  const handleSetCoach = (coach) => {
    if (coach) {
      setIsDirty(true)
      setCoach(coach)
      setForm({
        ...form,
        schedule: null,
        coach: { id: coach?.id || null, name: coach?.name || null }
      })
    } else {
      setCoach(null)
      setForm({
        schedule: null,
        coach: null
      })
    }
  }

  const { user } = useAuth()

  console.log(`user`, user)

  const [isDirty, setIsDirty] = useState(false)
  const handleSubmit = () => {
    console.log(`form`, form)
    updateSchedule({
      ...form,
      athleteId:user.athleteId,

    })
      .then((res) => {
        setIsDirty(false)
      })
      .catch((err) => console.log('err', err))
  }
  return (
    <div>
      <SelectCoach coach={form?.coach} setCoach={handleSetCoach} />

      <FormSchedule
        coach={coach}
        schedule={form?.schedule}
        setSchedule={handleScheduleChange}
      />
      {isDirty && (
        <div className="flex justify-center ">
          <Button fullWidth onClick={handleSubmit}>
            Actualizar horario
          </Button>
        </div>
      )}
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
