import { getAthletes } from '@/firebase/athletes'
import { getAttendanceDate } from '@/firebase/attendance'
import { getSchedule } from '@/firebase/schedules'
import { useAuth } from '@/src/context/AuthContext'
import useAthletes from '@/src/hooks/useAthletes'
import { BackIcon, ForwardIcon } from '@/src/utils/Icons'
import AthleteRow from '@comps/AthleteRow'
import Button from '@comps/inputs/Button'
import Toggle from '@comps/inputs/Toggle'
import Loading from '@comps/Loading'
import DayNotesModal from '@comps/Modals/DayNotesModal'
import SelectGroupsView from '@comps/SelectGroupsView'
import { addDays, format, getDay, subDays } from 'date-fns'
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

  const [coachSchedule, setCoachSchedule] = useState({})

  useEffect(() => {
    getSchedule(user.id)
      .then((res) => setCoachSchedule(res.schedule))
      .catch((err) => console.log('err', err))
  }, [])
  const [showAttendance, setShowAttendance] = useState(false)

  const [groupsView, setGroupsView] = useState('schedule')
  const handleSetView = (view) => setGroupsView(view)

  return (
    <div className="relative">
      <div className=" sticky  top-0 z-10 bg-gray-700 shadow-sm">
        <SelectGroupsView />

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
        <div className="py-2">
          <Toggle
            label="Mostrar notas y asistencia "
            onChange={({ target }) => setShowAttendance(target.checked)}
          />
        </div>
      </div>
      <div className="max-w-lg mx-auto">
        {coachSchedule?.[getDay(date)]?.map((schedule) => (
          <AthleteList
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

const AthleteList = ({ schedule, date, showAttendance }) => {
  const { athletesWithSchedule } = useAthletes()
  const [athltes, setAthltes] = useState(undefined)

  useEffect(() => {
    const getScheduleAthletes = ({ date = new Date(), schedule = '00:00' }) => {
      const day = getDay(date)
      return athletesWithSchedule?.filter(
        (athlete) =>
          !!athlete.schedule[day] && athlete.schedule?.[day]?.[0] === schedule
      )
    }

    setAthltes(getScheduleAthletes({ date, schedule }))
  }, [date, schedule, athletesWithSchedule])

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
  }, [date, athletesWithSchedule, showAttendance, schedule])

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
            athltes?.length ? athltes.length : ''
          })`}</span>
        </span>
        {athltes === undefined && <Loading />}
        {athltes?.length === 0 && 'Sin alumnos'}
      </div>
      {athltes?.map((athlete) => (
        <AthleteRow
          athlete={athlete}
          key={athlete.id}
          schedule={schedule}
          date={date}
          displaySetAttendance={showAttendance}
          assist={attendance.includes(athlete.id)}
        />
      ))}
    </div>
  )
}
