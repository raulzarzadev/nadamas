import { _getAthletes, _getUsers } from '@/legasy/firebase/admin'
import { useEffect, useMemo, useState } from 'react'

export default function useAdmin ({
  getUsers = false,
  getAthletes = false,
  // getEvents = false,
  // getResults = false,
  // getAttendance = false,
  // getTeams = false,
  // getSchedules = false
}) {
  const [data, setData] = useState({})

  const getData = async () => {
    console.log(`requested`)
    let data = {}
    getUsers &&
      (await _getUsers({ active: true })
        .then((res) => (data.users = res))
        .catch((err) => console.log(`err`, err)))
    getAthletes &&
      (await _getAthletes({ active: true })
        .then((res) => (data.athletes = res))
        .catch((err) => console.log(`err`, err)))
    return data
  }
    useEffect(() => {
      memoizedData
       .then((res) => setData(res))
       .catch((err) => console.log(`err`, err))
    }, []) 

  const memoizedData = useMemo(() => getData(), [])


  return { data }
}
