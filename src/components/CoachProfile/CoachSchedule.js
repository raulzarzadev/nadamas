import { getAthleteSchedule, updateAthleteSchedule } from '@/firebase/client'
import { useAuth } from '@/src/context/AuthContext'
import { formatObjectTimeToString } from '@/src/utils/Hours'
import { WarningIcon } from '@/src/utils/Icons'
import { useEffect, useState } from 'react'
import PickerDays from '../inputs/PickerDays'
import PickerTime from '../inputs/PickerTime'
import CoachScheduleDisplay from './CoachScheduleDisplay'

export default function CoachSchedule() {
  const { user } = useAuth()
  useEffect(() => {
    if (user) {
      getAthleteSchedule(user.id)
        .then((res) => setSchedule(res.schedule))
        .catch((err) => console.log(err))
    }
  }, [user])

  const [schedule, setSchedule] = useState({})
  const handleAddSchedule = (newSchedule) => {
    const updatedSchedule = formatNewSchedule(newSchedule, schedule)

    setSchedule(updatedSchedule)
    updateAthleteSchedule({
      athleteId: user?.id,
      isCoach: true,
      owner: user?.name,
      schedule: updatedSchedule
    })
      .then((res) => {
        // console.log('res', res)
      })
      .catch((err) => console.log('err', err))
  }

  return (
    <div>
      <div>
        <span className="bg-gray-100 bg-opacity-10 flex text-sm font-light items-center">
          <div className="mx-1">
            <WarningIcon />
          </div>
          Actualiza los dias y horas en que tus alumnos podran encontrarte
        </span>

        <ScheduleSelect
          schedule={schedule}
          handleAddSchedule={handleAddSchedule}
        />
        <CoachScheduleDisplay
          schedule={schedule}
          setSchedule={handleAddSchedule}
        />
      </div>
    </div>
  )
}

const ScheduleSelect = ({ schedule = {}, handleAddSchedule = () => {} }) => {
  const [time, setTime] = useState('--:--')
  const [days, setDays] = useState([])

  const handleSetDays = (days) => {
    setDays(days)
    handleAddSchedule({ hour: time, days })
  }

  const handleSetTime = (time) => {
    setTime(time)
    setDays(getDaysWithSchedule(time, schedule))
  }

  return (
    <>
      <div className="flex flex-col items-center px-2 justify-center">
        <PickerTime
          handleSetTime={(time) =>
            handleSetTime(formatObjectTimeToString({ time }))
          }
        />
        <PickerDays
          disabled={time === '--:--'}
          days={days}
          handleSetDays={handleSetDays}
        />
      </div>
    </>
  )
}

const formatNewSchedule = (
  newSchedule = { days: [], hour: '' },
  oldSchedule = { day: [''] }
) => {
  let res = {
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
    ...oldSchedule
  }
  let { hour, days } = newSchedule
  // console.log('hour, days, res', hour, days, res)
  for (const day in res) {
    if (Object.hasOwnProperty.call(res, day)) {
      if (res[day].includes(hour) && !days.includes(parseInt(day))) {
        res[day]?.splice(res[day].indexOf(hour), 1)
      } else if (days.includes(parseInt(day)) && !res[day].includes(hour)) {
        res[day].push(hour)
      }
    } else {
    }
  }
  //console.log('res', res)

  return res
}

const getDaysWithSchedule = (time, schedule) => {
  let res = []
  for (const day in schedule) {
    if (Object.hasOwnProperty.call(schedule, day)) {
      if (schedule[day].includes(time)) res.push(parseInt(day))
    }
  }
  return res
}
