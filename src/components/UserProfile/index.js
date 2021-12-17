import { useAuth } from '../../context/AuthContext'
import Section from '../Section'
import Loading from '@comps/Loading'

import TeamsList from '@comps/Teams/TeamsList'
import CoachSchedule from '@comps/Schedules/CoachSchedule'
import CoachEvents from '@comps/Events/CoachEvents'
import AthleteProfile from './AthleteProfile'
import { useEffect, useState } from 'react'

export default function UserProfile() {
  const { user } = useAuth()

  const [coachView, setCoachView] = useState(true)
  useEffect(() => {
    if (user) {
      user.coach ? setCoachView(true) : setCoachView(false)
    }
  }, [user])
  if (!user) return <Loading />

  return (
    <div className="">
      <div
        className={` py-2  flex w-full justify-around bg-gradient-to-r ${
          coachView
            ? 'from-primary dark:from-primary-light to-primary-dark'
            : 'from-primary-dark to-primary dark:to-primary-light'
        }`}
      >
        <button className="w-1/3 " onClick={() => setCoachView(true)}>
          Entrenador
        </button>
        <button className="w-1/3 " onClick={() => setCoachView(false)}>
          Atleta
        </button>
      </div>
      {coachView && <CoachSection coachId={user.id} isCoach={user?.coach} />}
      {!coachView && user?.athleteId && (
        <AthleteProfile athleteId={user.athleteId} />
      )}
    </div>
  )
}

const CoachSection = ({ isCoach = false, coachId }) => {
  if (!isCoach)
    return <div className='text-center'>No eres entrenador. ¿Quieres ser entrendor en nadamas?</div>
  return (
    <div>
      <Section title="Eventos organizados" indent={false}>
        <CoachEvents coachId={coachId} />
      </Section>
      <Section title="Mis equipos" indent={false}>
        <TeamsList coachId={coachId} />
      </Section>
      <Section title="Mi horario" indent={false}>
        <CoachSchedule coachId={coachId} />
      </Section>
    </div>
  )
}
