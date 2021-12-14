import React, { useEffect, useState } from 'react'
import FormSchedule from './FormSchedule'
import { addSchedule, getSchedules } from '@/firebase/schedules'
import Select from '@comps/inputs/Select'
import { getPublicCoachSchedules } from '@/firebase/coaches'
import Button from '@comps/inputs/Button'
import { useAuth } from '@/src/context/AuthContext'
import Loading from '@comps/Loading'

export default function AthleteSchedule({ athleteId }) {
  const { user } = useAuth()
  const handleScheduleChange = (newSchedule) => {
    setForm({ ...form, schedule: newSchedule })
  }

  // TODO fix no renderiza correctamente la primera vez que se abre
  const ownerIfo = { id: user.id, name: user.name } 

  const [form, setForm] = useState({})

  useEffect(() => {
    if (athleteId) {
      getSchedules(athleteId)
        .then(({ res }) => {
          setForm({ ...form, ...res[0] })
        })
        .catch((err) => console.log('err', err))
    }
  }, [athleteId])

  const handleSetCoach = (coach) => {
    console.log(`coach`, coach)
    setForm({
      ...form,
      coach: coach ? { id: coach?.id, name: coach?.name } : null
    })
    setAvailableSchedule(coach ? coach.schedule : null)
  }

  const [availableSchedule, setAvailableSchedule] = useState(null)

  const handleSubmit = () => {
    addSchedule({
      ...form,
      athleteId: athleteId,
      owner: ownerIfo
    })
      .then((res) => {})
      .catch((err) => console.log('err', err))
  }

  const [isDirty, setIsDirty] = useState(false)

  return (
    <div>
      <SelectCoach coach={form?.coach} setCoach={handleSetCoach} />
      <FormSchedule
        coach={form.coach}
        schedule={form?.schedule}
        availableSchedule={availableSchedule}
        setSchedule={handleScheduleChange}
      />
      {isDirty && (
        <div className="flex justify-center ">
          <Button fullWidth onClick={handleSubmit}>
            Actualizar horario
          </Button>
        </div>
      )}{' '}
    </div>
  )
}

const SelectCoach = ({ coach = null, setCoach = () => {} }) => {
  const [coachesList, setCoachesList] = useState([])

  useEffect(() => {
    getPublicCoachSchedules()
      .then((res) => setCoachesList(res))
      .catch((err) => console.log(`err`, err))
  }, [])

  useEffect(() => {
    setCoach(coachesList.find(({ id }) => id === coach.id))
  }, [])

  const handleChangeCoach = ({ target: { value } }) => {
    const coach = coachesList.find(({ id }) => value === id)
    setCoach(coach || null)
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
