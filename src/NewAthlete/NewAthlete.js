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
          <Schedule schedule={form?.schedule} onChange={handleChangeSchedule} />
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
              type="tel"
              label="Titulo"
            />
            <Text
              onChange={handleChange}
              name="emerName"
              value={form?.emerName}
              type="tel"
              label="Nombre"
            />
            <Text
              onChange={handleChange}
              name="emerMobile"
              value={form?.emerMobile}
              label="email"
              label="Numero"
            />
          </div>
          <Button type="submit">Guardar</Button>
        </div>
      </form>
    </div>
  )
}
const Schedule = ({ schedule = [], onChange }) => {
  const week = [{ day: 'Lunes', value: '17:00' }]
  console.log('schedule', schedule)
  const onChangeSchedule = (day) => {
    day
  }
  return (
    <div className={s.schedule}>
      {week.map(({ day, value }) => (
        <div>
          <h4>{day}</h4>
          <Text
            onChange={() => onChangeSchedule(day)}
            value={value}
            type="time"
          />
        </div>
      ))}
    </div>
  )
}