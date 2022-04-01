import { getUser } from '@/firebase/users'
import { dateFormat } from '@/utils/dates'
import UserForm from '@comps/Forms/UserForm'
import ButtonIcon from '@comps/Inputs/Button/ButtonIcon'
import Loading from '@comps/Loading'
import Modal from '@comps/Modal'
import Section from '@comps/Section'
import AthleteTeamsSection from '@comps/Teams/AthleteTeamsSecttion'
import { useState, useEffect } from 'react'
import CoachSection from './CoachSection'
import UserSection from './UserSection'

export default function SectionUserInfo({ userId }) {
  const [user, setUser] = useState(undefined)
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
