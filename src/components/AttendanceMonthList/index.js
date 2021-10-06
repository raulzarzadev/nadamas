import { getAttendanceDate } from '@/firebase/attendance'
import { useEffect, useState } from 'react'
import { differenceInCalendarDays } from 'date-fns'
import { useAuth } from '@/src/context/AuthContext'
import { getAthleteSchedule } from '@/firebase/client'
import { format } from 'src/utils/Dates'
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
          setSchedules(aux)
        })
        .catch((err) => console.log(err))
    }
  }, [user])

  useEffect(() => {
    if (!!schedules.length) {
      getMonthAttendance()
    }
  }, [])

  const [monthAttendance, setMonthAtthendace] = useState([])
  const getMonthAttendance = () => {
    const firstDayOfTheMonth = new Date(new Date().setDate(1))
    const currentDayOfTheMonth = new Date()
    const daysFromStartMonts = differenceInCalendarDays(
      currentDayOfTheMonth,
      firstDayOfTheMonth
    )
    const auxArr = []
    for (let i = 0; i < daysFromStartMonts; i++) {
      for (let j = 0; j < schedules.length; j++) {
        getAttendanceDate(
          new Date(new Date().setDate(i + 1)),
          schedules[j],
          (attendance, notes) => {
            const attendanceDateAlreadyExist =
              auxArr.find(({ id }) => id === attendance.id) || false
            if (!attendanceDateAlreadyExist) {
              auxArr.push(attendance)
            }
          }
        )
        setMonthAtthendace(auxArr)
      }
    }
  }

  console.log('monthAttendance', monthAttendance)
  //* *  console.log('schedule', schedule)

  // obtener la lista de asistencia del mes corriente
  // desde el primer dia de este mes hasta el dia actual

  return (
    <div className="">
      {schedules.map((schedule, i) => (
        <div key={i}>
          {schedule}
          <div>
            {monthAttendance
              .filter((day) => day.schedule === schedule)
              .map(({ attendance, date }, i) => (
                <div key={i}>
                  {attendance.map((id) => (
                    <div key={id}>{id}</div>
                  ))}
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}
