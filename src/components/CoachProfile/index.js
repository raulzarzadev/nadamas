import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import Text from '../../InputFields/Text'
import { updateUser } from '@/firebase/client'
import CoachSchedule from './CoachSchedule'
import Section from '../Section'

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
    <div className="px-2 pt-6">
      <div className="mb-4">
        <Text
          label="Nombre"
          value={form.name}
          onChange={handleChange}
          name="name"
        />
      </div>

      <div className="mb-4">
        <Text
          label="Correo"
          value={form.email}
          onChange={handleChange}
          name="email"
        />
      </div>
      <Section title="Horarios" open>
        <h5 className="text-center font-bold">Disponibilidad</h5>
        <CoachSchedule />
      </Section>
      <div>
        {/*  estadisiticas de alumnos */}
        {/* Cuantos alumnos hay */}
        {/* Cuantos por clase */}
      </div>
    </div>
  )
}
