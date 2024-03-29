import s from './styles.module.css'
import { BackIcon, ClipboardIcon, ForwardIcon } from '../../utils/Icons'
import { useEffect, useState } from 'react'
import { addDays, subDays } from 'date-fns'
import { dayLabels, format } from '../../utils/Dates'
import { useAuth } from '../../context/AuthContext'
import AthleteRow from '../AthleteRow'
import Button from '@/legasy/src/components/inputs/Button'
import { getAttendanceDate } from '@/legasy/firebase/attendance'
import Toggle from '@/legasy/src/components/inputs/Toggle'
import DayNotesModal from '@/legasy/src/components/Modals/DayNotesModal'
import { getAthlete } from '@/legasy/firebase/athletes'
import Loading from '@/components/Loading'
import { getSchedules } from '@/legasy/firebase/schedules'

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
    getSchedules(user.id)
      .then(({res}) => setCoachSchedule(res[0].schedule))
      .catch((err) => console.log('err', err))
  }, [])

  return (
    <div className="">
      <div className="flex sticky py-2 justify-center items-center">
        <div className="w-1/4 flex justify-center">
          <Button iconOnly size="xs" variant="secondary" onClick={handleSubDay}>
            <BackIcon size="2rem" />
          </Button>
        </div>
        <h3>{format(date, 'EEEE dd MMM')}</h3>
        <div className="w-1/4 flex justify-center">
          <Button iconOnly size="xs" variant="secondary" onClick={handleAddDay}>
            <ForwardIcon size="2rem" />
          </Button>
        </div>
      </div>

      <div className="px-4 md:max-w-md mx-auto">
        <ScheduleDay
          coachSchedules={coachSchedule[date?.getDay()]}
          day={date?.getDay()}
          date={date}
        />
      </div>
    </div>
  )
}

const ScheduleDay = ({ coachSchedules, day, date }) => {
  const [showAttendance, setShowAttendance] = useState(false)

  return (
    <div>
      <div className="py-2">
        <Toggle
          label="Mostrar notas y asistencia "
          onChange={({ target }) => setShowAttendance(target.checked)}
        />
      </div>
      {coachSchedules?.map((schedule, i) => (
        <div key={i}>
          <AtleteScheduleTable
            schedule={schedule}
            day={day}
            date={date}
            showAttendance={showAttendance}
          />
        </div>
      ))}
    </div>
  )
}

const AtleteScheduleTable = ({
  schedule,
  day,
  date = { date },
  showAttendance
}) => {
  const [athletes, setAthletes] = useState(undefined)

  useEffect(() => {
    if (showAttendance) {
      getAttendanceDate(date, schedule, ({ attendance, notes }) => {
        notes ? setNotes(notes) : setNotes('')
      })
        .then((res) => {
          // res?.attendance ? setAttendance(res.attendance) : setAttendance([])
        })
        .catch((err) => console.log('err', err))
    }
  }, [date, athletes, showAttendance, schedule])

  const [attendance, setAttendance] = useState([])
  const [notes, setNotes] = useState('')

  if (athletes === undefined) return <Loading />

  return (
    <div>
      <div className="flex">
        {showAttendance && (
          <DayNotesModal schedule={schedule} date={date} notes={notes} />
        )}
        <h3 className="text-2xl font-bold ml-2">{schedule}</h3>
      </div>
      {showAttendance && (
        <div className="flex justify-end pr-24 text-sm font-light">
          Asistencia
        </div>
      )}
      {athletes?.length === 0 && <span>Sin athletas</span>}
      {athletes?.map((athlete, i) => (
        <Athlete
          key={i}
          athleteId={athlete}
          schedule={schedule}
          date={date}
          assist={attendance.includes(athlete)}
          showAttendance={showAttendance}
        />
      ))}
    </div>
  )
}

const Athlete = ({ athleteId, date, assist, showAttendance, schedule }) => {
  const [athlete, setAthlete] = useState(undefined)
  useEffect(() => {
    getAthlete(athleteId)
      .then((res) => {
        setAthlete(res)
      })
      .catch((err) => console.log('err', err))
  }, [athleteId])

  if (athlete === undefined) return <Loading />
  if (athlete === null) return <></>
  return (
    <AthleteRow
      schedule={schedule}
      athlete={athlete}
      date={date}
      displaySetAttendance={showAttendance}
      assist={assist}
    />
  )
}
