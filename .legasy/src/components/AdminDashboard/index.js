import { _deleteAthlete, _deleteUser } from '@/legasy/firebase/admin'
import useAdmin from '@/legasy/src/hooks/useAdmin'
import { useState } from 'react'
import AthletesSection from './AthletesSection'
import UsersSection from './UsersSection'

export default function AdminDashboard() {
  const { data } = useAdmin({ getUsers: true, getAthletes: true })
  const setUserSelected = (userSelected) => {
    setUser(userSelected)
  }
  const [user, setUser] = useState(undefined)
  return (
    <div className="">
      <UsersSection users={data?.users} setUser={setUserSelected} />
      <AthletesSection athletes={data.athletes} userSelected={user} />
    </div>
  )
}
