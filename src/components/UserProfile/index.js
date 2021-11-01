import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import CoachSchedule from './CoachSchedule'
import Section from '../Section'
import Text from '@comps/inputs/Text'
import Loading from '@comps/Loading'
import FormAthlete from '@comps/FormAthlete'
import Button from '@comps/inputs/Button'
import { useRouter } from 'next/router'
import { ROUTES } from '@/pages/ROUTES'
import TeamsList from '@comps/Teams/TeamsList.js'

export default function UserProfile() {
  const { user } = useAuth()
  if (!user) return <Loading />

  const [form, setForm] = useState({})

  const handleChange = ({ target: { value, name } }) => {
    setForm({ ...form, [name]: value })
  }

  const [isCoach, setIsCoach] = useState(false)

  useEffect(() => {
    if (user) {
      setForm(user)
      if (user.coach) {
        setIsCoach(true)
      } else {
        setIsCoach(false)
      }
    }
  }, [user])

  const athleteId = user.athleteId

  return (
    <div className="pt-4">
      {!athleteId && !isCoach && <ConfigAthlete />}

      <div className="max-w-md mx-auto pb-6">
        {isCoach && <CoachSecctions />}
        {athleteId && <AthleteSecctions athleteId={athleteId} />}
        {!athleteId && (
          <Section title="Información de usuario" indent={false} open>
            <div className="flex flex-col items-center px-2 pt-6">
              <div className="mb-4 md:w-1/2 p-2">
                <Text
                  label="Nombre"
                  value={form.name}
                  onChange={handleChange}
                  name="name"
                />
              </div>
              <div className="mb-4 md:w-1/2 p-2">
                <Text
                  label="Correo"
                  value={form.email}
                  onChange={handleChange}
                  name="email"
                />
              </div>
            </div>
          </Section>
        )}
        <div>
          {/*  estadisiticas de alumnos */}
          {/* Cuantos alumnos hay */}
          {/* Cuantos por clase */}
        </div>
      </div>
    </div>
  )
}

const ConfigAthlete = () => {
  const router = useRouter()
  const handleConfigAthlete = () => {
    router.push(`${ROUTES.athletes.new()}?configSwimmer=true`)
  }
  return (
    <div className="text-center">
      <div className="w-3/4 mx-auto p-2">
        <Button
          label="Configurar nadador"
          onClick={handleConfigAthlete}
        ></Button>
      </div>
    </div>
  )
}

const CoachSecctions = () => (
  <div>
    <Section title="Horario" indent={false}>
      <CoachSchedule />
    </Section>
    <Section title="Equipos" indent={false}>
      <TeamsList />
    </Section>

    {/* <Section title="Grupos">
      <AttendanceMonthList />
    </Section> */}
  </div>
)

const AthleteSecctions = ({ athleteId }) => (
  <div>
    <FormAthlete athleteId={athleteId} />
  </div>
)
