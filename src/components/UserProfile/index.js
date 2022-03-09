import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import CoachProfile from './CoachProfile'
import AthleteProfile from './AthleteProfile'
import Loading from '@comps/Loading'

export default function UserProfile() {
  const { user } = useAuth()

  const views = {
    COACH: 'Entrenador',
    ATHLETE: 'Atleta'
  }

  const [view, setView] = useState(views.ATHLETE)

  useEffect(() => {
    if (user?.coach) {
      setView(views.COACH)
    }
  }, [])


  if (!user) return <Loading />

  return (
    <div className="">
      <div
        className={` py-2  flex w-full justify-around bg-gradient-to-r ${
          view === views.COACH
            ? 'from-primary dark:from-primary-light to-primary-dark '
            : 'from-primary-dark to-primary dark:to-primary-light'
        }`}
      >
        <button
          className={`w-1/3 text-2xl   ${
            view === views.ATHLETE ? ' font-bold' : 'font-thin'
          }`}
          onClick={() => setView(views.ATHLETE)}
        >
          {views.ATHLETE}
        </button>
        <button
          className={`w-1/3 text-2xl ${
            view === views.COACH ? ' font-bold' : 'font-thin'
          }`}
          onClick={() => setView(views.COACH)}
        >
          {views.COACH}
        </button>
      </div>
      {view === views.COACH && (
        <CoachProfile coachId={user.id} isCoach={user?.coach} />
      )}
      {view === views.ATHLETE && <AthleteProfile athleteId={user.athleteId} />}
    </div>
  )
}
