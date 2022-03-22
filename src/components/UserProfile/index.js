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
    <div className="pt-4">
   {/*    <div
        className={` py-2  flex w-full justify-around bg-gradient-to-r ${
          view === views.COACH
            ? 'from-primary dark:from-primary-light to-primary-dark '
            : 'from-primary-dark to-primary dark:to-primary-light'
        }`}
      >
        <button
          className={`w-1/2    ${
            view === views.ATHLETE ? ' font-bold text-2xl' : 'font-thin text-sm'
          }`}
          onClick={() => setView(views.ATHLETE)}
        >
          {views.ATHLETE}
        </button>
        <button
          className={`w-1/2  ${
            view === views.COACH ? ' font-bold text-2xl' : 'font-thin text-sm'
          }`}
          onClick={() => setView(views.COACH)}
        >
          {views.COACH}
        </button>
      </div> */}
      {view === views.COACH && (
        <CoachProfile coachId={user.id} isCoach={user?.coach} />
      )}
      {view === views.ATHLETE && <AthleteProfile athleteId={user.id} />}
    </div>
  )
}
