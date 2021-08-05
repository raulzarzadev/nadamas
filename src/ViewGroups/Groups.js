import s from './styles.module.css'
import { BackIcon, ForwardIcon } from '../utils/Icons'
import { useEffect, useState } from 'react'
import {
  getAthlete,
  getAthletes,
  getAthletesBySchedule,
  getAttendanceDate,
  updateAttendanceList
} from '@/firebase/client'
import { addDays, subDays } from 'date-fns'
import { dayLabels, format } from '../utils/Dates'
import Button from '../Button'
import { useAuth } from '../context/AuthContext'
import AthleteRow from '../AthleteRow'

export default function Groups() {
  const [athletes, setAthletes] = useState([])
  const { user } = useAuth()

  const [day, setDay] = useState(new Date())
  const handleSubDay = () => {
    setDay(subDays(day, 1))
  }
  const handleAddDay = () => {
    setDay(addDays(day, 1))
  }
  /* 
  const firstSchedule = filterAthltesBy(day.getDay(), '17')
  const secondSchedule = filterAthltesBy(day.getDay(), '18')
  const thirthSchedule = filterAthltesBy(day.getDay(), '19')
 */
  const handleSetAttendance = (id, e) => {
    const { checked } = e.target
    let attendance = checked
      ? [...attendanceList?.attendance, id]
      : attendanceList?.attendance.filter((athlete) => athlete !== id)
    setAttendanceList({ date: new Date(day), attendance })
    updateAttendanceList({ date: new Date(day), attendance })
  }

  const [attendanceList, setAttendanceList] = useState({
    date: day,
    attendance: []
  })
  /* 
  useEffect(() => {
    getAttendanceDate(day)
      .then((res) => console.log('res', res))
      .catch((err) => console.log('err', err))
  }, [day]) */

  return (
    <div className={s.groups}>
      <div className={s.week_nav}>
        <Button p="sm" icon onClick={handleSubDay}>
          <BackIcon size="3rem" />
        </Button>
        <h3>{format(day, 'EEEE dd MMM')}</h3>
        <Button p="sm" icon onClick={handleAddDay}>
          <ForwardIcon size="3rem" />
        </Button>
      </div>

      <ScheduleDay
        coachSchedules={user?.schedule[day?.getDay()]}
        day={day?.getDay()}
      />
    </div>
  )
}

const ScheduleDay = ({ coachSchedules, day }) => {
  return (
    <div>
      {coachSchedules?.map((schedule, i) => (
        <div key={i}>
          <h3>{schedule}</h3>
          <AtleteScheduleTable schedule={schedule} day={day} />
        </div>
      ))}
    </div>
  )
}

const AtleteScheduleTable = ({ schedule, day }) => {
  const [athletes, setAthletes] = useState([])
  useEffect(() => {
    getAthletesBySchedule({ schedule, day })
      .then((res) => setAthletes(res))
      .catch((err) => console.log('err', err))
  }, [schedule,day])

  return (
    <div>
      {athletes.map((athlete, i) => (
        <Athlete key={i} athleteId={athlete} />
      ))}
    </div>
  )
}

const Athlete = ({ athleteId }) => {
  const [athlete, setAthlete] = useState(undefined)
  useEffect(() => {
    getAthlete(athleteId)
      .then(setAthlete)
      .catch((err) => console.log('err', err))
  }, [athleteId])

  if (athlete === undefined) return 'Cargando ...'

  return <AthleteRow athlete={athlete} />
}
