import { useEffect, useState } from 'react'
import Button from '../Button'
import Text from '../InputFields/Text'
import s from './styles.module.css'
import { getAthlete, updateAtlete } from '@/firebase/client'
import { useRouter } from 'next/router'
import { format, formatInputDate } from '../utils/Dates'
import { TrashBinIcon } from '../utils/Icons'
export default function NewAthlete() {
  const router = useRouter()
  useEffect(() => {
    if (router.query.id) {
      getAthlete(router.query.id).then(setForm)
    }
  }, [])
  const [form, setForm] = useState({
    birth: new Date(),
    schedule: []
  })
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  console.log('form', form)
  const handleSubmit = async () => {
    const res = await updateAtlete(form)
    console.log('res', res)
  }

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
          <Schedule form={form} setForm={setForm} />
          <Button type="submit" my="md">
            Guardar
          </Button>
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
const Schedule = ({ form, setForm }) => {
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

  const [schedule, setSchedule] = useState([])

  const handleChangeSchedule = (evt) => {
    const { value, name } = evt.target
    const newSchedule = schedule.map((time) => {
      if (time.day === name) return { day: name, time: value }
      return time
    })

    setForm({ ...form, schedule: newSchedule })
  }
  const setTimeToNull = (nameDay) => {
    const newSchedule = schedule.map((day) => {
      if (day.day === nameDay) return { day: nameDay, time: null }
      return day
    })
    setForm({ ...form, schedule: newSchedule })
  }

  useEffect(() => {
    setSchedule(form.schedule || base)
    console.log('form', form)
  }, [form.schedule])

  const formatHoursTime = (time) => {
    if (time) {
      return `${time}:00`
    } else {
      return `--:--`
    }
  }

  return (
    <>
      <div className={s.schedule}>
        {form.schedule.map(({ day, time }) => (
          <div>
            <div className={s.day_title}>
              <h4>{day}</h4>
              <Button onClick={() => setTimeToNull(day)}>
                <TrashBinIcon size="1rem" />
              </Button>
            </div>
            <HoursInput
              name={day}
              value={time}
              onChange={handleChangeSchedule}
            />
            {/*   <input
              style={{ background: '#000', color: '#fff' }}
              value={formatHoursTime(time)}
              type="text"
              step="1"
              min="1"
              max="24"
              name={day}
              onChange={handleChangeSchedule}
            /> */}

            {/*  <Text
              step="3600"
              onChange={handleChangeSchedule}
              name={day}
              value={time}
              type="time"
            /> */}
          </div>
        ))}
      </div>
    </>
  )
}

const HoursInput = ({ name, value, onChange }) => {
  const availableHours = []
  for (let i = 6; i < 23; i++) {
    availableHours.push({
      value: i,
      label: `${i <= 9 ? `0${i}:00` : `${i}:00`}`
    })
  }

  return (
    <select name={name} value={value || null} onChange={onChange}>
      <option value={null}>--:--</option>
      {availableHours.map((hour) => (
        <option key={hour.value} value={hour.value}>
          {hour.label}
        </option>
      ))}
    </select>
  )
}
