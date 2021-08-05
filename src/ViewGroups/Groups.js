import s from './styles.module.css'
import { BackIcon, ForwardIcon } from '../utils/Icons'
import { useEffect, useState } from 'react'
import {
  getAthletes,
  getAttendanceDate,
  updateAttendanceList
} from '@/firebase/client'
import { addDays, subDays } from 'date-fns'
import { format } from '../utils/Dates'
import Button from '../Button'
import AthleteRow from '../AthleteRow'
import { useAuth } from '../context/AuthContext'

export default function Groups() {
  const [athletes, setAthletes] = useState([])
  const { user } = useAuth()
  
  const getAthletesSuscribedForToday=(day)=>{
    
  }
  
  /* const firstHour = athletes.filter(({ schedule }) => {
    return schedule?.find(({ day, time }) => day === 1 && time !== null)
  })
  
  */
 /*  const filterAthltesBy = (dayOfweek, hour) => {
   return athletes?.filter(({ schedule, name }) => {
     console.log(schedule, name)
     return schedule?.find(
       ({ day, time }) => day === dayOfweek && time === hour
       )
      })
    }
    */
   const [day, setDay] = useState(new Date())
   useEffect(() => {
     if (user) getAthletes(user?.id).then(setAthletes)
   }, [user])

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

  useEffect(() => {
    getAttendanceDate(day)
      .then((res) => console.log('res', res))
      .catch((err) => console.log('err', err))
  }, [day])

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
      <h3>{`17:00 hrs`}</h3>
      {/* {firstSchedule?.map((athlete) => (
        <AthleteRow
          key={athlete.id}
          athlete={athlete}
          handleSetAttendance={handleSetAttendance}
          assist={attendanceList.attendance.includes(athlete.id)}
        />
      ))}
      <h3>{`18:00 hrs`}</h3>
      {secondSchedule?.map((athlete) => (
        <AthleteRow
          key={athlete.id}
          athlete={athlete}
          handleSetAttendance={handleSetAttendance}
          assist={attendanceList.attendance.includes(athlete.id)}
        />
      ))}
      <h3>{`19:00 hrs`}</h3>
      {thirthSchedule?.map((athlete) => (
        <AthleteRow
          key={athlete.id}
          athlete={athlete}
          handleSetAttendance={handleSetAttendance}
          assist={attendanceList.attendance.includes(athlete.id)}
        />
      ))} */}
    </div>
  )
}
