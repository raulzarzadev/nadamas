import { useEffect, useState } from 'react'
import Button from '../Button'
import Text from '../InputFields/Text'
import s from './styles.module.css'
import { getAthlete, updateAtlete } from '@/firebase/client'
import { useRouter } from 'next/router'
import { formatInputDate } from '../utils/Dates'
export default function NewAthlete() {
  const router = useRouter()
  useEffect(() => {
    if (router.query.id) {
      getAthlete(router.query.id).then(setForm)
    }
  }, [])
  const [form, setForm] = useState({
    birth: new Date()
  })
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleChangeSchedule = (e) => {
    console.log('e', e)
  }

  const handleSubmit = async () => {
    const res = await updateAtlete(form)
    console.log('res', res)
  }
  console.log('form', form)

  return (
    <div className={s.newathlete}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSubmit()
        }}
      >
        <div className={s.form_box}>
          <h3>Atleta</h3>
          <div className={s.inputs}>
            <Text
              value={form?.name}
              onChange={handleChange}
              name="name"
              label="Nombre"
            />
            <Text
              value={form?.secondName}
              onChange={handleChange}
              name="secondName"
              label="S.Nombre"
            />
            <Text
              value={form?.lastName}
              onChange={handleChange}
              name="lastName"
              label="A.Paterno"
            />
            <Text
              value={form?.mothersLastName}
              onChange={handleChange}
              name="mothersLastName"
              label="A.Materno"
            />
            <Text
              value={formatInputDate(form?.birth)}
              onChange={handleChange}
              name="birth"
              label="Fecha De Nacimiento"
              type="date"
            />
          </div>
          <Button type="submit">Guardar</Button>
        </div>
        <div className={s.form_box}>
          <h3>Horario</h3>
          <Schedule form={form} onChange={handleChangeSchedule} />
          <Button type="submit">Guardar</Button>
        </div>
        <div className={s.form_box}>
          <h3>Contacto</h3>
          <div className={s.inputs}>
            <Text
              onChange={handleChange}
              value={form.mobile}
              name="mobile"
              type="tel"
              label="Celular"
            />
            <Text
              onChange={handleChange}
              value={form.email}
              name="email"
              label="email"
              label="Correo"
            />
          </div>
          <Button type="submit">Guardar</Button>
        </div>
        <div className={s.form_box}>
          <h3>Emergencia</h3>
          <div className={s.inputs}>
            <Text
              onChange={handleChange}
              name="emerTitle"
              value={form?.emerTitle}
              label="Titulo"
            />
            <Text
              onChange={handleChange}
              name="emerName"
              value={form?.emerName}
              label="Nombre"
            />
            <Text
              type="tel"
              onChange={handleChange}
              name="emerMobile"
              value={form?.emerMobile}
              label="Numero"
            />
          </div>
          <Button type="submit">Guardar</Button>
        </div>
      </form>
    </div>
  )
}
const Schedule = ({ form, onChange }) => {
  const base = [
    {
      day: 'Lunes',
      time: null
    },
    {
      day: 'Martes',
      time: null
    },
    {
      day: 'Miercoles',
      time: null
    },
    {
      day: 'Jueves',
      time: null
    },
    {
      day: 'Viernes',
      time: null
    }
  ]
  const [schedule, setSchedule] = useState(base)

  const onChangeSchedule = (e, day) => {
    const time = e.target.value
    setSchedule([...schedule, { day, time }])
    onChange({ ...form, schedule })
  }

  console.log('schedule', schedule)
  console.log('form', form)

  return (
    <div className={s.schedule}>
      {base.map(({ day, time }) => (
        <div>
          <h4>{day}</h4>
          <Text
            onChange={(e) => onChangeSchedule(e, day)}
            value={time}
            type="time"
          />
        </div>
      ))}
    </div>
  )
}
