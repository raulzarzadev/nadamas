import s from './styles.module.css'
import { BackIcon, ForwardIcon } from '../../utils/Icons'
import { useEffect, useState } from 'react'
import {
  getAthlete,
  getAthletes,
  getAthletesBySchedule,
  getAthleteSchedule,
  getAttendanceDate,
  updateAttendanceList
} from '@/firebase/client'
import { addDays, subDays } from 'date-fns'
import { dayLabels, format } from '../../utils/Dates'
import { useAuth } from '../../context/AuthContext'
import AthleteRow from '../AthleteRow'
import Button from '@comps/inputs/Button'

export default function Groups() {
  const { user } = useAuth()

  const [date, setDate] = useState(new Date())
  const handleSubDay = () => {
    setDate(subDays(date, 1))
  }
  const handleAddDay = () => {
    setDate(addDays(date, 1))
  }

  const [coachSchedule, setCoachSchedule] = useState({})
  useEffect(() => {
    getAthleteSchedule(user.id)
      .then((res) => setCoachSchedule(res.schedule))
      .catch((err) => console.log('err', err))
  }, [])

  const handleSetAttendance = (id, e) => {
    const { checked } = e.target
    let attendance = checked
      ? [...attendanceList?.attendance, id]
      : attendanceList?.attendance.filter((athlete) => athlete !== id)
    setAttendanceList({ date: new Date(day), attendance })
    updateAttendanceList({ date: new Date(day), attendance })
  }

  const [attendanceList, setAttendanceList] = useState({
    date: date,
    attendance: []
  })

  return (
    <div className="">
      <div className="flex sticky py-2 justify-center items-center">
        <div className="w-1/4 flex justify-center">
          <Button iconOnly size="xs" variant="secondary" onClick={handleSubDay}>
            <BackIcon size="3rem" />
          </Button>
        </div>
        <h3>{format(date, 'EEEE dd MMM')}</h3>
        <div className="w-1/4 flex justify-center">
          <Button iconOnly size="xs" variant="secondary" onClick={handleAddDay}>
            <ForwardIcon size="3rem" />
          </Button>
        </div>
      </div>
      <div className="px-4 md:max-w-md mx-auto">
        <ScheduleDay
          coachSchedules={coachSchedule[date?.getDay()]}
          day={date?.getDay()}
        />
      </div>
    </div>
  )
}

const ScheduleDay = ({ coachSchedules, day }) => {
  return (
    <div>
      {coachSchedules?.map((schedule, i) => (
        <div key={i}>
          <h3 className="text-2xl font-bold">{schedule}</h3>
          <AtleteScheduleTable schedule={schedule} day={day} />
        </div>
      ))}
    </div>
  )
}

const AtleteScheduleTable = ({ schedule, day }) => {
  const [athletes, setAthletes] = useState(undefined)
  useEffect(() => {
    if (schedule) {
      getAthletesBySchedule({ schedule, day })
        .then((res) => setAthletes(res))
        .catch((err) => console.log('err', err))
      return () => {
        setAthletes([])
      }
    }
  }, [schedule, day])


  if (athletes === undefined) return 'Cargando ...'

  return (
    <div>
      {athletes?.length === 0 && <span>Sin athletas</span>}
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
      .then((res) => {
        setAthlete(res)
      })
      .catch((err) => console.log('err', err))
  }, [athleteId])

  if (athlete === undefined) return 'Cargando ... x'
  if (athlete === null) return <></>
  return <AthleteRow athlete={athlete} />
}
