import Text from '@comps/inputs/Text'
import { useEffect, useState } from 'react'
import Section from '../Section'
import CoachSchedule from './CoachSchedule'

export default function FormUser({ user }) {
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
    <>
      <h2 className="text-2xl text-center">Información personal </h2>
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
      <div>
        <h2 className="text-2xl text-center">Entrenador </h2>
        <Section title="Horarios disponibles">
          <h3 className="text-1xl">Horarios disponibles</h3>
          <div className="">
            <CoachSchedule  />
          </div>
        </Section>
      </div>
    </>
  )
}
