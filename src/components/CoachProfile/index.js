import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { updateUser } from '@/firebase/client'
import CoachSchedule from './CoachSchedule'
import Section from '../Section'
import Text from '@comps/inputs/Text'

export default function CoachProfile() {
  const { user } = useAuth()
  if (!user) return 'Cargando ...'

  const [form, setForm] = useState({})

  const handleChange = ({ target: { value, name } }) => {
    setForm({ ...form, [name]: value })
  }

  useEffect(() => {
    if (user) {
      setForm(user)
    }
  }, [user])
  /* De esto */

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
        <Section title="Horario">
          <CoachSchedule />
        </Section>
        <Section title="Grupos">
         
        </Section>
        <div>
          {/*  estadisiticas de alumnos */}
          {/* Cuantos alumnos hay */}
          {/* Cuantos por clase */}
        </div>
      </div>
    </div>
  )
}
