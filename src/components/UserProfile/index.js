import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import CoachSchedule from './CoachSchedule'
import Section from '../Section'
import Text from '@comps/inputs/Text'
import AttendanceMonthList from '@comps/AttendanceMonthList'
import AthleteSchedule from './AthleteSchedule'
import Loading from '@comps/Loading'

export default function UserProfile() {
  const { user } = useAuth()
  if (!user) return <Loading />

  const [form, setForm] = useState({})

  const handleChange = ({ target: { value, name } }) => {
    setForm({ ...form, [name]: value })
  }

  const [isCoach, setIsCoach] = useState(false)

  useEffect(() => {
    if (user) {
      setForm(user)
      if (user.coach) {
        setIsCoach(true)
      } else {
        setIsCoach(false)
      }
    }
  }, [user])

  return (
    <div>
      <div className="flex flex-col items-center px-2 pt-6 ">
        <div className="mb-4 md:w-1/2 p-2">
          <Text
            label="Nombre"
            value={form.name}
            onChange={handleChange}
            name="name"
          />
        </div>

        <div className="mb-4 md:w-1/2 p-2">
          <Text
            label="Correo"
            value={form.email}
            onChange={handleChange}
            name="email"
          />
        </div>
      </div>
      <div className="max-w-md mx-auto">
        {isCoach ? <CoachSecctions /> : <AthleteSecctions />}

        <div>
          {/*  estadisiticas de alumnos */}
          {/* Cuantos alumnos hay */}
          {/* Cuantos por clase */}
        </div>
      </div>
    </div>
  )
}

const CoachSecctions = () => (
  <div>
    <Section title="Horario">
      <CoachSchedule />
    </Section>
    <Section title="Grupos">
      <AttendanceMonthList />
    </Section>
  </div>
)

const AthleteSecctions = () => (
  <div>
    <Section title="Horario" open>
      <AthleteSchedule />
    </Section>
  </div>
)
