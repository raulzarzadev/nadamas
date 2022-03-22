import { getAthlete } from '@/legasy/firebase/athletes'
import { getAttendanceDate } from '@/legasy/firebase/attendance'
import {
  getAthletesBySchedule,
  getCoachSchedule,
  getSchedule,
  getSchedules
} from '@/legasy/firebase/schedules'
import { useAuth } from '@/legasy/src/context/AuthContext'
import useAthlete from '@/legasy/src/hooks/useAthlete'
import { format } from '@/legasy/src/utils/Dates'
import { BackIcon, ForwardIcon } from '@/legasy/src/utils/Icons'
import Info from '@/legasy/src/components/Alerts/Info'
import AthleteRow from '@/legasy/src/components/AthleteRow'
import Button from '@/legasy/src/components/inputs/Button'
import Toggle from '@/legasy/src/components/inputs/Toggle'
import Loading from '@/components/Loading'
import DayNotesModal from '@/legasy/src/components/Modals/DayNotesModal'
import SelectGroupsView from '@/legasy/src/components/SelectGroupsView'
import { addDays, getDay, subDays } from 'date-fns'
import { useEffect, useState } from 'react'
import TeamsView from './TeamsView'

export default function Grups() {
  const { user } = useAuth()

  const [date, setDate] = useState(new Date())
  const handleSubDay = () => {
    setDate(subDays(date, 1))
  }
  const handleAddDay = () => {
    setDate(addDays(date, 1))
  }

  const [coachSchedule, setCoachSchedule] = useState(undefined)

  useEffect(() => {
    getCoachSchedule({coachId:user.id})
      .then(({ res }) => {
        console.log(`res`, res)
        const schedule = res?.schedule
        if (schedule) {
          setCoachSchedule(schedule)
        } else {
          setCoachSchedule(null)
        }
      })
      .catch((err) => console.log('err', err))
  }, [])
  const [showAttendance, setShowAttendance] = useState(false)

  if (coachSchedule === undefined) return <Loading />
  return (
    <div className="relative">
      <div className=" sticky  top-0 z-10 bg-gray-700 shadow-sm">
        <div className="flex py-2 justify-center items-center">
          <div className="w-1/4 flex justify-center">
            <Button
              iconOnly
              size="xs"
              variant="secondary"
              onClick={handleSubDay}
            >
              <BackIcon size="2rem" />
            </Button>
          </div>
          <h3>{format(date, 'EEEE dd MMM')}</h3>
          <div className="w-1/4 flex justify-center">
            <Button
              iconOnly
              size="xs"
              variant="secondary"
              onClick={handleAddDay}
            >
              <ForwardIcon size="2rem" />
            </Button>
          </div>
        </div>
        {/*  <div className="py-2">
          <Toggle
            label="Mostrar notas y asistencia "
            onChange={({ target }) => setShowAttendance(target.checked)}
          />
        </div> */}
        <div>
          {coachSchedule === null && (
            <Info text="No tienes horarios habilitados" fullWidth />
          )}  
        </div>
      </div>
      <div className="max-w-lg mx-auto">
        {coachSchedule?.[getDay(date)]?.map((schedule) => (
          <HourAthleteList
            coachId={user.id}
            key={schedule}
            schedule={schedule}
            date={date}
            showAttendance={showAttendance}
          />
        ))}
      </div>
    </div>
  )
}

const HourAthleteList = ({ schedule, date, showAttendance, coachId }) => {
  const [athletes, setAthletes] = useState(undefined)
  useEffect(() => {
    getAthletesBySchedule(coachId, schedule, date)
      .then((res) => {
        const formatList = res.map((athlete) => {
          return athlete?.athleteId
        })
        setAthletes(formatList)
      })
      .catch((err) => console.log(`err`, err))
  }, [date])

  const [attendance, setAttendance] = useState([])
  const [notes, setNotes] = useState('')
  useEffect(() => {
    if (showAttendance) {
      getAttendanceDate(date, schedule, ({ attendance, notes }) => {
        attendance ? setAttendance(attendance) : setAttendance([])
        notes ? setNotes(notes) : setNotes('')
      })
        .then((res) => {
          // res?.attendance ? setAttendance(res.attendance) : setAttendance([])
        })
        .catch((err) => console.log('err', err))
    }
  }, [date, showAttendance, schedule])
  console.log(`athletes`, athletes)

  return (
    <div>
      <div className="flex">
        <div className="mr-2">
          {showAttendance && (
            <DayNotesModal schedule={schedule} date={date} notes={notes} />
          )}
        </div>
        <span className="text-2xl font-bold">
          {`${schedule}`}
          <span className="text-base font-thin">{` (${
            athletes?.length ? athletes.length : '0'
          })`}</span>
        </span>
        <div className="flex items-center ">
          {athletes === undefined && <Loading />}
        </div>
      </div>
      {athletes?.map((athlete) => (
        <Athletes
          key={athlete}
          athlete={athlete}
          schedule={schedule}
          date={date}
          displaySetAttendance={showAttendance}
          assist={attendance.includes(athlete.id)}
        />
      ))}
    </div>
  )
}

const Athletes = ({
  athlete,
  schedule,
  date,
  assist,
  displaySetAttendance
}) => {
console.log(`athlete`, athlete)
  const { athlete: athleteInfo } = useAthlete(athlete)
  console.log(`athleteInfo`, athleteInfo)
  if (athleteInfo === undefined) return <Loading />
  return (
    <AthleteRow
    groupView={true}
      athlete={athleteInfo}
      key={athleteInfo.id}
      schedule={schedule}
      date={date}
      displaySetAttendance={displaySetAttendance}
      assist={assist}
    />
  )
}
