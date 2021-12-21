import { _getAthletes, _getUsers } from '@/firebase/admin'
import { useEffect, useState } from 'react'

export default function useAdmin({
  getUsers = false,
  getAthletes = false,
  getEvents = false,
  getResults = false,
  getAttendance = false,
  getTeams = false,
  getSchedules = false
}) {
  const [data, setData] = useState({})

  useEffect(() => {
    getData()
      .then((res) => setData(res))
      .catch((err) => console.log(`err`, err))
  }, [])

  const getData = async () => {
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

  return { data }
}
