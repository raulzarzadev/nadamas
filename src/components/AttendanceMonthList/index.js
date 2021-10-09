import { getAttendanceDate, getMonthAttendance } from '@/firebase/attendance'
import { useEffect, useState } from 'react'
import {
  addMonths,
  differenceInCalendarDays,
  format,
  getDaysInMonth,
  subMonths
} from 'date-fns'
import { useAuth } from '@/src/context/AuthContext'
import { getAthleteSchedule } from '@/firebase/client'
import useAthletes from '@/src/hooks/useAthletes'
import { dayLabels } from '@/src/utils/Dates'
export default function AttendanceMonthList() {
  const [schedules, setSchedules] = useState([])

  const { user } = useAuth()
  useEffect(() => {
    if (user) {
      getAthleteSchedule(user.id)
        .then((res) => {
          const aux = []
          Object.keys(res.schedule).forEach((day) => {
            res.schedule?.[day]?.forEach(
              (hour) => !aux.includes(hour) && aux.push(hour)
            )
          })
          return aux
        })
        .catch((err) => console.log(err))
        .then(setSchedules)
    }

    // setSchedules()
  }, [user])

  const [monthAttendance, setMonthAtthendace] = useState([])
  const [attendanceDate, setAttendanceDate] = useState(new Date())

  useEffect(() => {
    if (!!schedules.length) {
      getMonthAttendance(attendanceDate).then(setMonthAtthendace)
    }
  }, [])
  // schedules, attendanceDate
  const { athletesWithSchedule } = useAthletes()

  useEffect(() => {
    let auxArr = []
    monthAttendance.forEach(({ attendance, schedule, date }) => {
      const day = new Date(date).getDate()
      attendance.forEach((athlete) => {
        const athleteExist = auxArr.find(
          ({ athleteId, date }) => athlete === athleteId
        )
        const athleteInlcudeSchedule = athleteExist?.days.includes(date)
        if (!athleteExist) {
          auxArr.push({ athleteId: athlete, days: [day] })
        } else if (!athleteInlcudeSchedule) {
          athleteExist?.days?.push(day)
        }
      })
    })
    if (athletesWithSchedule) {
      const formatedAttendanceList = auxArr.map(({ athleteId, days }) => {
        const athlteInfo = athletesWithSchedule.find(
          ({ id }) => id === athleteId
        )
        return {
          athleteId,
          days,
          athlete: athlteInfo,
          schedule: athlteInfo?.schedule
        }
      })
      setMonthAttendanceList(formatedAttendanceList)
    }
  }, [monthAttendance, athletesWithSchedule])

  const [monthAttendanceList, setMonthAttendanceList] = useState([])

  const [monthDays, setMonthDays] = useState([])
  useState(() => {
    let auxArr = []
    for (let i = 0; i < getDaysInMonth(attendanceDate); i++) {
      auxArr.push(i + 1)
    }
    setMonthDays(auxArr)
  }, [attendanceDate])

  const handleAddMonth = () => {
    setAttendanceDate(addMonths(attendanceDate, 1))
  }
  const handleRestMonth = () => {
    setAttendanceDate(subMonths(attendanceDate, 1))
  }
  console.log('', monthAttendance)

  return (
    <div>
      Asistencia del mes
      <div className=" flex justify-center">
        <div className="p-4" onClick={handleRestMonth}>{`<`}</div>
        <div className="p-4">{`${format(attendanceDate, 'MMMM yyyy')}`}</div>
        <div className="p-4" onClick={handleAddMonth}>{`>`}</div>
      </div>
      <div className="flex">
        <div>
          <div className="flex w-full ">
            <div className="w-32 ">Nombre</div>
            <div className="w-20 px-2 text-center">Dias</div>
          </div>
          {monthAttendanceList.map(({ athlete, id, schedule, days }, i) => (
            <div key={i} className="flex relative">
              <div className="w-32">{athlete?.name}</div>
              <div className="w-20 flex justify-center px-2">
                {schedule &&
                  Object?.keys(schedule)?.map((day) => dayLabels[day][0])}
              </div>
            </div>
          ))}
        </div>

        <div className="overflow-auto">
          <div className="flex">
            {monthDays.map((day, i) => (
              <div key={i} className="">
                <div className="w-5 text-center ">{day}</div>
              </div>
            ))}
          </div>
          {monthAttendanceList.map(({ days }, i) => (
            <div key={i} className="flex ">
              {monthDays.map((day, i) => (
                <div
                  key={i}
                  className={`
                    ${days.includes(day) && 'bg-gray-600'}
                  `}
                >
                  <div className="w-5 text-center">
                    {days.includes(day) ? day : ''}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
/* 
<div className="w-1/2  flex overflow-auto">
            {monthDays.map((day) => (
              <div key={day}>
                <div
                  className={`
                  ${
                  days.includes(day) &&
                  `bg-gray-100
                `
                }
                w-6
                `}
                ></div>
              </div>
            ))}
          </div>
          <div className="w-1/2  flex overflow-auto">
          {monthDays.map((day) => (
            <div className="w-6" key={day}>
              {day}
            </div>
          ))}
        </div>
           */
