import { getAthletes } from '@/firebase/athletes'
import { getSchedules } from '@/firebase/schedules'
import { getDay } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function useAthletes() {
  const { user } = useAuth()

  const [athletes, setAthletes] = useState([])
  const [athletesWithSchedule, setAthletesWithSchedule] = useState(undefined)

  useEffect(() => {
    getAthletes(user.id)
      .then(setAthletes)
      .catch((err) => console.log(err))
  }, [user.ids])

  useEffect(() => {
    function formatAthlte() {
      return athletes.map(async (athlete) => {
        const schedule = await getSchedules(athlete.id).then(
          (res) => res?.schedule
        )
        const newAthlte = schedule
          ? { ...athlete, schedule }
          : { ...athlete, schedule: {} }
        return newAthlte
      })
    }
    if (athletes.length > 0) {
      Promise.all(formatAthlte()).then(setAthletesWithSchedule)
    }
  }, [athletes])

  const getScheduleAthletes = ({ date = new Date(), schedule = '00:00' }) => {
    const day = getDay(date)
    return athletesWithSchedule?.filter(
      (athlete) =>
        !!athlete.schedule[day] && athlete.schedule?.[day]?.[0] === schedule
    )
  }
  return { athletes, athletesWithSchedule }
}
