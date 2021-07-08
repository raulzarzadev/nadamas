import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Text from '../InputFields/Text'
import { dayLabels } from '../utils/Dates'
import { AddIcon, TrashBinIcon } from '../utils/Icons'
import Button from '../Button'
import PickerTime from '../PickerTime'
import PickerDays from '../PickerDays'
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
  
  const handleSetUserSchedule = (schedule) => {
    console.log('schedule', schedule)
    
    setForm({ ...form, schedule })
  }
  useEffect(()=>{
    console.log('form', form)
  },[form.schedule])

  return (
    <div className={s.viewprofile}>
      <div>
        <Text
          label="Nombre"
          value={form.name}
          onChange={handleChange}
          name="name"
        />
      </div>

      <div>
        <Text
          label="Correo"
          value={form.email}
          onChange={handleChange}
          name="email"
        />
      </div>
      <h3>Horarios disponibles</h3>
      <ScheduleForm
        schedule={form?.schedule}
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
