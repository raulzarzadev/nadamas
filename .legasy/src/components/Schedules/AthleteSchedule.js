import React, { useEffect, useState } from 'react'
import FormSchedule from './FormSchedule'
import { addSchedule, getSchedules } from '@/legasy/firebase/schedules'
import Select from '@/legasy/src/components/inputs/Select'
import { getPublicCoachSchedules } from '@/legasy/firebase/coaches'
import { useAuth } from '@/legasy/src/context/AuthContext'
import Button from '@/legasy/src/components/inputs/Button'

export default function AthleteSchedule({ athleteId }) {
  const { user } = useAuth()

  const ownerIfo = { id: user.id, name: user.name }

  const [form, setForm] = useState({})

  useEffect(() => {
    if (athleteId) {
      getSchedules(athleteId)
        .then(({ res }) => {
          setForm({ ...res[0] })
        })
        .catch((err) => console.log('err', err))
    }
  }, [athleteId])

  const handleScheduleChange = (newSchedule) => {
    setIsDirty(true)
    setForm({ ...form, schedule: newSchedule })
  }
  const handleSetCoach = (coach, props = { defaultValue: false }) => {
   // defaultValue es una bandera que previene renderice el boton de guardar con la primer modificaci
    const { defaultValue } = props
    if (!defaultValue) setIsDirty(true)
    setCoach(coach)
    setForm({
      ...form,
      coach: coach ? { id: coach?.id, name: coach?.name } : null
    })
  }

  const [coach, setCoach] = useState(undefined)

  const handleSubmit = () => {
    addSchedule({
      ...form,
      athleteId: athleteId,
      owner: ownerIfo
    })
      .then((res) => {
        setIsDirty(false)
      })
      .catch((err) => console.log('err', err))
  }

  const [isDirty, setIsDirty] = useState(false)

  return (
    <div>
      <SelectCoach coach={form?.coach} setCoach={handleSetCoach} />
      <FormSchedule
        schedule={form?.schedule}
        setSchedule={handleScheduleChange}
        coachSchedule={coach?.schedule}
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

const SelectCoach = ({ coach = null, setCoach = () => {} }) => {
  const [coachesList, setCoachesList] = useState([])
  useEffect(() => {
    getPublicCoachSchedules()
      .then((res) => setCoachesList(res.filter(({ schedule }) => !!schedule)))
      .catch((err) => console.log(`err`, err))
  }, [])

  const handleChangeCoach = (coachSelected) => {
    const coach = coachesList.find(({ id }) => coachSelected === id)
    setCoach(coach || null)
  }

  useEffect(() => {
    if (coach)
      setCoach(
        coachesList.find(({ id }) => id === coach?.id),
        { defaultValue: true }
      )
  }, [coachesList])

  return (
    <Select
      value={coach?.id}
      label=" Horario de entrenador"
      onChange={({ target: { value } }) => handleChangeCoach(value)}
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
