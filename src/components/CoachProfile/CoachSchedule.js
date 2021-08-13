import { getAthleteSchedule, updateAthleteSchedule } from '@/firebase/client'
import { useAuth } from '@/src/context/AuthContext'
import { AddIcon } from '@/src/utils/Icons'
import { set } from 'date-fns'
import { useEffect, useState } from 'react'
import Button from '../Button'
import PickerDays from '../PickerDays'
import PickerTime from '../PickerTime'
import CoachScheduleDisplay from './CoachScheduleDisplay'

export default function CoachSchedule() {
  const { user, userSchedule } = useAuth()
  useEffect(() => {
    if (user) {
      getAthleteSchedule(user.id)
        .then(res => setSchedule(res.schedule))
        .catch((err) => console.log(err))
    }
  }, [user])

  const [schedule, setSchedule] = useState({})

  const handleAddSchedule = (newSchedule) => {
    setSchedule(formatNewSchedule(newSchedule, schedule))
  }

  useEffect(() => {
    updateAthleteSchedule({ athleteId: user.id, schedule })
  }, [schedule])

  return (
    <div>
      Schedule
      <div>
        <CoachScheduleDisplay schedule={schedule} setSchedule={setSchedule} />
        <ScheduleSelect
          schedule={schedule}
          handleAddSchedule={handleAddSchedule}
        />
      </div>
    </div>
  )
}

const ScheduleSelect = ({ schedule = {}, handleAddSchedule = () => {} }) => {
  const initalFormState = { hour: '00:00', days: [] }
  const [form, setForm] = useState(initalFormState)

  const _handleSetTime = (time) => {
    setForm({ ...form, hour: time })
  }
  const _handleSetDays = (days) => {
    setForm({ ...form, days })
    handleAddSchedule({ ...form, days })
  }

  const [days, setDays] = useState([])

  useEffect(() => {
    // Find days whit form.hour inside and set days select
    let daysWithThisTime = []
    Object.keys(schedule).forEach((day) => {
      if (schedule[day].includes(form.hour)) {
        daysWithThisTime = [...daysWithThisTime, parseInt(day)]
      }
      setDays(daysWithThisTime)
    })
  }, [form.hour])

  return (
    <div>
      <PickerTime
        time={form?.hour}
        minutesStep="15"
        handleSetTime={_handleSetTime}
      />
      <PickerDays days={days} handleSetDays={_handleSetDays} />
    </div>
  )
}

const formatNewSchedule = (
  newSchedule = { days: [], hour: '' },
  oldSchedule = { day: [''] }
) => {
  // newshedule = {days:[], hour:""}
  // oldschedule = {1:[""],2:[""]}
  let res = { ...oldSchedule }
  newSchedule.days.forEach((day) => {
    if (!res[day]) {
      res[day] = [newSchedule.hour]
    } else if (!res[day].includes(newSchedule.hour)) {
      res[day].push(newSchedule.hour)
    }
  })
  //res : {day:[]}
  return res
}
