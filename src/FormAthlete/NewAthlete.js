import { useEffect, useState } from 'react'
import Button from '../Button'
import Text from '../InputFields/Text'
import s from './styles.module.css'
import { getAthlete, updateAtlete } from '@/firebase/client'
import { useRouter } from 'next/router'
import { dayLabels, format, formatInputDate } from '../utils/Dates'
import { TrashBinIcon, SaveIcon, AddPersonIcon } from '../utils/Icons'
import Avatar from '../Avatar'
import DeleteModal from '../Modals/DeleteModal'

const scheduleBase = [
  {
    day: 0,
    time: null
  },
  {
    day: 1,
    time: null
  },
  {
    day: 2,
    time: null
  },
  {
    day: 3,
    time: null
  },
  {
    day: 4,
    time: null
  },
  {
    day: 5,
    time: null
  },
  {
    day: 6,
    time: null
  }
]

export default function NewAthlete() {
  const router = useRouter()
  const [updatingAthlete, setUpdatingAthlete] = useState(null)
  useEffect(() => {
    const { id } = router?.query
    if (id) {
      getAthlete(id).then((res) => {
        setUpdatingAthlete(id)
        setForm(res)
      })
    }
  }, [])
  const [form, setForm] = useState({
    birth: new Date(),
    schedule: scheduleBase
  })
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async () => {
    const res = await updateAtlete({ ...form, active: true })
    if (res.type === 'ATHLETE_CREATED') {
      router.push(`/atletas/${res.id}`)
    }
    console.log('res', res)
  }

  console.log('form', form)
  const handleUploadAvatar = () => {
    console.log('uplad')
  }
  const handleDelete = () => {
    console.log('delete', updatingAthlete)
    updateAtlete({ id: updatingAthlete, active: false })
    setTimeout(() => {
      router.back()
    }, 400)
  }
  const [openDelete, setOpenDelete] = useState(false)
  const handleOpenDelete = () => {
    setOpenDelete(!openDelete)
  }
  return (
    <div className={s.newathlete}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSubmit()
        }}
      >
        <div className={s.save_button}>
          <Button p="lg" secondary icon type="submit">
            {updatingAthlete ? <SaveIcon /> : <AddPersonIcon />}
          </Button>
        </div>
        <div className={s.form_box}>
          <div className={s.title}>
            <h3>Atleta</h3>
            <Avatar upload onClick={handleUploadAvatar} href="/" />
          </div>

          <div className={s.inputs}>
            <Text
              value={form?.name}
              onChange={handleChange}
              name="name"
              label="Nombre (s)"
            />

            <Text
              value={form?.lastName}
              onChange={handleChange}
              name="lastName"
              label={'Apelldio(s)'}
            />

            <Text
              value={formatInputDate(form?.birth)}
              onChange={handleChange}
              name="birth"
              label="Fecha De Nacimiento"
              type="date"
            />
          </div>
        </div>
        <div className={s.form_box}>
          <h3>Horario</h3>
          <Schedule hideWeekend form={form} setForm={setForm} />
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
        </div>
      </form>
      <Button p="2" my="md" danger onClick={handleOpenDelete}>
        Eliminar
      </Button>
      <DeleteModal
        open={openDelete}
        handleDelete={handleDelete}
        name={form?.name}
        handleOpen={handleOpenDelete}
      />
    </div>
  )
}
const Schedule = ({ form, setForm, hideWeekend }) => {
  const [schedule, setSchedule] = useState([])

  const handleChangeSchedule = (evt) => {
    const { value, name } = evt.target
    const newSchedule = schedule.map(({ day, time }) => {
      if (day == name) return { day: parseInt(name), time: value }
      return { time, day }
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
    if (form.schedule) {
      setSchedule(form.schedule)
    }
  }, [form.schedule])

  const listDays = hideWeekend
    ? schedule.filter(({ day }) => day !== 0 && day !== 6)
    : schedule

  return (
    <>
      <div className={s.schedule}>
        {listDays?.map(({ day, time }) => (
          <div className={s.schedule_day}>
            <HoursInput
              name={day}
              value={time}
              onChange={handleChangeSchedule}
            />
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
    <>
      <div className={s.day_title}>
        <div>{dayLabels[name]}</div>
        <div>
          <Button danger icon onClick={() => setTimeToNull(day)}>
            <TrashBinIcon size="1rem" />
          </Button>
        </div>
      </div>
      <div className={s.select}>
        <select
          className={s.select_schedule}
          name={name}
          value={value || null}
          onChange={onChange}
        >
          <option value={null}>--:--</option>
          {availableHours.map((hour) => (
            <option key={hour.value} value={hour.value}>
              {hour.label}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}
