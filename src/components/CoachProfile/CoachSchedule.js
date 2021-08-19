import { getAthleteSchedule, updateAthleteSchedule } from '@/firebase/client'
import { useAuth } from '@/src/context/AuthContext'
import { formatObjectTimeToString } from '@/src/utils/Hours'
import { AddIcon } from '@/src/utils/Icons'
import { set } from 'date-fns'
import { useEffect, useState } from 'react'
import Button from '@comps/inputs/Button'
import PickerDays from '../inputs/PickerDays'
import PickerTime from '../inputs/PickerTime'
import CoachScheduleDisplay from './CoachScheduleDisplay'

export default function CoachSchedule() {
  const { user, userSchedule } = useAuth()
  useEffect(() => {
    if (user) {
      getAthleteSchedule(user.id)
        .then((res) => setSchedule(res.schedule))
        .catch((err) => console.log(err))
    }
  }, [user])

  const [schedule, setSchedule] = useState({})

  const handleAddSchedule = (newSchedule) => {
    setSchedule(formatNewSchedule(newSchedule, schedule))
  }

  console.log('schedule', schedule)

  return (
    <div>
      <div>
        <ScheduleSelect
          /* schedule={schedule}
           */
          handleAddSchedule={handleAddSchedule}
        />
        <CoachScheduleDisplay schedule={schedule} setSchedule={setSchedule} />
      </div>
    </div>
  )
}

const ScheduleSelect = ({ schedule = {}, handleAddSchedule = () => {} }) => {
  const [time, setTime] = useState('--:--')
  const [days, setDays] = useState([])

  const handleSetDays = (days) => {
    setDays(days)
    handleAddSchedule({ hour: formatObjectTimeToString({ time }), days })
  }

  const handleSetTime = (time) => {
    setTime(time)
  }

  return (
    <>
      <h5 className="text-center mt-4 font-bold">
        Crear / editar nuevo horario
      </h5>
      <div className="flex flex-col items-center px-2 justify-center">
        <PickerTime handleSetTime={handleSetTime} />
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
  let res = { ...oldSchedule }
  let { hour, days } = newSchedule
  //console.log('hour, days, res', hour, days, res)

  for (const day in res) {
    if (Object.hasOwnProperty.call(res, day)) {
      if (res[day].includes(hour) && !days.includes(parseInt(day))) {
        res[day]?.splice(res[day].indexOf(hour), 1)
      } else if (days.includes(parseInt(day)) && !res[day].includes(hour)) {
        res[day].push(hour)
      }
    }
  }

  return res
}
