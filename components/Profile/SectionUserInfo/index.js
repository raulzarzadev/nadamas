import { getUser } from '@/firebase/users'
import Loading from '@comps/Loading'
import AthleteTeamsSection from '@comps/Teams/AthleteTeamsSecttion'
import { useState, useEffect } from 'react'
import CoachSection from './CoachSection'
import UserSection from './UserSection'

export default function SectionUserInfo({ userId }) {
  const [user, setUser] = useState(undefined)
  console.log(user)
  useEffect(() => {
    userId && getUser(userId).then(setUser)
  }, [])


  if (!user) return <Loading />

  const { isCoach } = user

  return (
    <div>
      {isCoach && <CoachSection user={user} />}
      {!isCoach && <AthleteTeamsSection userId={userId} openSection={true} />}
      <UserSection user={user}/>
    </div>
  )
}