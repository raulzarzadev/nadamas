import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Text from '../InputFields/Text'
import s from './styles.module.css'
import { updateUser } from '@/firebase/client'
import ScheduleForm from '../ScheduleForm'

export default function ViewProfile() {
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
    updateUser({ ...form, schedule})
  }

 
  return (
    <div className='px-2 pt-6'>
      <div className='mb-4'> 
        <Text
          label="Nombre"
          value={form.name}
          onChange={handleChange}
          name="name"
        />
      </div>

      <div className='mb-4' >
        <Text
          label="Correo"
          value={form.email}
          onChange={handleChange}
          name="email"
        />
      </div>
      <h3>Horarios disponibles</h3>
      <ScheduleForm
        schedule={form.schedule}
        setSchedule={handleSetUserSchedule}
      />
      <div>
        {/*  estadisiticas de alumnos */}
        {/* Cuantos alumnos hay */}
        {/* Cuantos por clase */}
      </div>
    </div>
  )
}

