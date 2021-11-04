import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import Section from '../Section'
import Text from '@comps/inputs/Text'
import Loading from '@comps/Loading'
import Button from '@comps/inputs/Button'
import { useRouter } from 'next/router'
import { ROUTES } from '@/ROUTES'

import TeamsList from '@comps/Teams/TeamsList.js'
import FormAthlete from '@comps/Athlete/FormAthlete'
import CoachSchedule from '@comps/Schedules/CoachSchedule'
import CoachEvents from '@comps/Events/CoachEvents'

export default function UserProfile() {
  const { user } = useAuth()
  const [form, setForm] = useState({})
  const handleChange = ({ target: { value, name } }) => {
    setForm({ ...form, [name]: value })
  }

  useEffect(() => {
    if (user) {
      setForm(user)
    }
  }, [user])

  if (!user) return <Loading />
  return (
    <div className="pt-4">
      <div className="max-w-lg mx-auto pb-6">
        {user?.coach && (
          <Section title="Entrenador">
            <CoachSection coachId={user.id} />
          </Section>
        )}
        {!user?.coach && <AthleteSection athleteId={user.athleteId} />}

        <Section title="Información de usuario" indent={false}>
          <div className="flex flex-col items-center px-2 pt-6">
            <div className="mb-4 md:w-1/2 p-2">
              <Text
                label="Nombre"
                value={form?.name}
                onChange={handleChange}
                name="name"
              />
            </div>
            <div className="mb-4 md:w-1/2 p-2">
              <Text
                label="Correo"
                value={form?.email}
                onChange={handleChange}
                name="email"
              />
            </div>
          </div>
        </Section>
      </div>
    </div>
  )
}

const AthleteSection = ({ athleteId }) => {
  const router = useRouter()
  const handleConfigAthlete = () => {
    router.push(`${ROUTES.athletes.new()}?configSwimmer=true`)
  }
  return (
    <div className="text-center">
      {athleteId ? (
        <FormAthlete athleteId={athleteId} />
      ) : (
        <div className="w-3/4 mx-auto p-2">
          <Button
            label="Configurar nadador"
            onClick={handleConfigAthlete}
          ></Button>
        </div>
      )}
    </div>
  )
}

const CoachSection = ({ coachId }) => (
  <div>
    <Section title="Eventos" indent={false}>
      <CoachEvents coachId={coachId} />
    </Section>
    <Section title="Horario" indent={false}>
      <CoachSchedule coachId={coachId} />
    </Section>
    <Section title="Equipos" indent={false}>
      <TeamsList coachId={coachId} />
    </Section>
  </div>
)
