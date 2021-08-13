import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import Text from '../../InputFields/Text'
import { updateUser } from '@/firebase/client'
import CoachSchedule from './CoachSchedule'

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

  const handleSetUserSchedule = (schedule = []) => {
    updateUser({ ...form, schedule })
  }

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
      <h3>Horarios disponibles</h3>
      <CoachSchedule />
      <div>
        {/*  estadisiticas de alumnos */}
        {/* Cuantos alumnos hay */}
        {/* Cuantos por clase */}
      </div>
    </div>
  )
}
