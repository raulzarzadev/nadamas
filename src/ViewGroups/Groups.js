import s from './styles.module.css'
import {
  BackIcon,
  ContactIcon,
  EditIcon,
  EmergencyIcon,
  ForwardIcon
} from '../utils/Icons'
import { useEffect, useState } from 'react'
import { getAthletes } from '@/firebase/client'
import { addDays, subDays } from 'date-fns'
import { format } from '../utils/Dates'
import Button from '../Button'
import EmergencyCallModal from '../Modals/EmergencyCallModal'
import AthleteRow from '../AthleteRow'

export default function Groups() {
  const [athletes, setAthletes] = useState([])
  useEffect(() => {
    getAthletes().then(setAthletes)
  }, [])

  /* const firstHour = athletes.filter(({ schedule }) => {
    return schedule?.find(({ day, time }) => day === 1 && time !== null)
  })

  */
  const filterAthltesBy = (dayOfweek, hour) => {
    console.log('dayOfweek', dayOfweek)

    return athletes.filter(({ schedule, name }) => {
      console.log('schedule', name, schedule)

      return schedule?.find(
        ({ day, time }) => day === dayOfweek && time === hour
      )
    })
  }

  const [day, setDay] = useState(new Date())
  const handleSubDay = () => {
    setDay(subDays(day, 1))
  }
  const handleAddDay = () => {
    setDay(addDays(day, 1))
  }

  const firstSchedule = filterAthltesBy(day.getDay(), '17')
  const secondSchedule = filterAthltesBy(day.getDay(), '18')
  const thirthSchedule = filterAthltesBy(day.getDay(), '19')

  console.log('day Selected', day.getDay())

  return (
    <div className={s.groups}>
      <div className={s.week_nav}>
        <Button p='sm' icon onClick={handleSubDay}>
          <BackIcon size="3rem" />
        </Button>
        <h3>{format(day, 'EEEE dd MMM')}</h3>
        <Button p='sm' icon onClick={handleAddDay}>
          <ForwardIcon size="3rem" />
        </Button>
      </div>
      <h3>{`17:00 hrs`}</h3>
      {firstSchedule.map((athlete) => (
        <AthleteRow key={athlete.id} athlete={athlete} />
      ))}
      <h3>{`18:00 hrs`}</h3>
      {secondSchedule.map((athlete) => (
        <AthleteRow key={athlete.id} athlete={athlete} />
      ))}
      <h3>{`19:00 hrs`}</h3>
      {thirthSchedule.map((athlete) => (
        <AthleteRow key={athlete.id} athlete={athlete} />
      ))}
    </div>
  )
}
