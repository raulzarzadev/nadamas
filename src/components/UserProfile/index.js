import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import Section from '../Section'
import Text from '@comps/inputs/Text'
import Loading from '@comps/Loading'

import TeamsList from '@comps/Teams/TeamsList.js'
import FormAthlete from '@comps/Athlete/FormAthlete'
import CoachSchedule from '@comps/Schedules/CoachSchedule'
import CoachEvents from '@comps/Events/CoachEvents'
import AthleteProfile from './AthleteProfile'

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
      {user?.coach && <CoachSection coachId={user.id} />}
      {user?.athleteId && <AthleteProfile athleteId={user.athleteId} />}
    </div>
  )
}

const AthleteSection = ({ athleteId }) => {
  return (
    <div className="text-center">
      <FormAthlete athleteId={athleteId} />
    </div>
  )
}

const CoachSection = ({ coachId }) => (
  <div>
    <Section title="Eventos" indent={false} open>
      <CoachEvents coachId={coachId} />
    </Section>
    <Section title="Equipos" indent={false} open>
      <TeamsList coachId={coachId} />
    </Section>
    <Section title="Horario" indent={false}>
      <CoachSchedule coachId={coachId} />
    </Section>
  </div>
)
