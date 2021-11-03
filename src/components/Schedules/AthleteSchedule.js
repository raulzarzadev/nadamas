import React, { useEffect, useState } from 'react'
import FormSchedule from './FormSchedule'
import { getSchedules, updateSchedule } from '@/firebase/schedules'

export default function AthleteSchedule({ athleteId }) {
  const [athleteSchedule, setAthleteSchedule] = useState({})
  const handleScheduleChange = (newSchedule) => {
    updateSchedule({
      owner: { id: athleteId },
      schedule: newSchedule
    })
      .then((res) => console.log('res', res))
      .catch((err) => console.log('err', err))
  }

  useEffect(() => {
    if (athleteId) {
      getSchedules(athleteId)
        .then((res) => {
          setAthleteSchedule(res?.schedule)
        })
        .catch((err) => console.log('err', err))
    }
  }, [athleteId])
  console.log(`athleteSchedule`, athleteSchedule)

  return (
    <FormSchedule
      schedule={athleteSchedule}
      setSchedule={handleScheduleChange}
    />
  )
}
