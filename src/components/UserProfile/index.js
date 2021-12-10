import { useAuth } from '../../context/AuthContext'
import Section from '../Section'
import Loading from '@comps/Loading'

import TeamsList from '@comps/Teams/TeamsList.js'
import CoachSchedule from '@comps/Schedules/CoachSchedule'
import CoachEvents from '@comps/Events/CoachEvents'
import AthleteProfile from './AthleteProfile'

export default function UserProfile() {
  const { user } = useAuth()


  if (!user) return <Loading />

  return (
    <div className="pt-4">
      {user?.coach && <CoachSection coachId={user.id} />}
      {user?.athleteId && <AthleteProfile athleteId={user.athleteId} />}
    </div>
  )
}



const CoachSection = ({ coachId }) => (
  <div>
    <Section title="Eventos organizados" indent={false} >
      <CoachEvents coachId={coachId} />
    </Section>
    <Section title="Mis equipos" indent={false} >
      <TeamsList coachId={coachId} />
    </Section>
    <Section title="Mi horario" indent={false}>
      <CoachSchedule coachId={coachId} />
    </Section>
  </div>
)
