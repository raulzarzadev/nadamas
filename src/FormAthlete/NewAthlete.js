import { useEffect, useState } from 'react'
import Button from '../Button'
import s from './styles.module.css'
import { getAthlete, updateAtlete } from '@/firebase/client'
import { useRouter } from 'next/router'
import { dayLabels, format, formatInputDate } from '../utils/Dates'
import {
  TrashBinIcon,
  SaveIcon,
  AddPersonIcon,
  AddIcon,
  ForwardIcon,
  DownIcon
} from '../utils/Icons'
import Avatar from '../Avatar'
import DeleteModal from '../Modals/DeleteModal'
import Text from '../InputFields/Text'
import Textarea from '../InputFields/Textarea'

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
    schedule: scheduleBase,
    records: []
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
  const [record, setRecord] = useState({ place: 'CREA', date: new Date() })
  const handleSetRecord = (e) => {
    const { name, value } = e.target
    setRecord({ ...record, [name]: value })
  }

  const handleAddRecord = () => {
    if (Array.isArray(form.records)) {
      setForm({ ...form, records: [...form?.records, record] })
    } else {
      setForm({ ...form, records: [record] })
    }
    setRecord({ date: new Date(), place: 'CREA' })
  }

  const handleRemoveRecord = (record) => {
    const records = form.records.filter(
      ({ test, date }) => record.test !== test && date !== record.date
    )
    setForm({ ...form, records })
    console.log('records', records)
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
            <h2>Atleta</h2>
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
        <Section title={'Horario'}>
          <Schedule hideWeekend form={form} setForm={setForm} />
        </Section>
        <Section title={'Contacto'}>
          <div className={`${s.inputs} ${s.contact}`}>
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
        </Section>
        <Section title={'Registros'}>
          <Records
            records={form?.records}
            handleRemoveRecord={handleRemoveRecord}
          />
          <div className={s.record}>
            <Text
              onChange={handleSetRecord}
              name="date"
              type="date"
              value={formatInputDate(record?.date)}
              label="Fecha"
            />
            <Text
              onChange={handleSetRecord}
              name="place"
              value={record?.place}
              label="Lugar"
            />
            <Text
              onChange={handleSetRecord}
              name="test"
              value={record?.test}
              label="Prueba"
            />
            <Text
              onChange={handleSetRecord}
              name="time"
              type="number"
              value={record?.time}
              label="Tiempo"
            />
            <Button primary p="sm" onClick={handleAddRecord}>
              <AddIcon />
            </Button>
          </div>
        </Section>
        <Section title={'Información Médica'}>
          <div className={s.medic_info}>
            <Text
              onChange={handleChange}
              name="vacines"
              value={form?.vacines}
              label="Vacunas"
              placeholder="Vacunas (covid)"
            />
            <Textarea
              onChange={handleChange}
              label="Dolores"
              value={form?.hurts}
              name="hurts"
            />
            <Textarea
              onChange={handleChange}
              label="Condiciones"
              value={form?.conditions}
              name="conditions"
            />
          </div>
        </Section>
        <Section title={'Emergencia'}>
          <div className={`${s.inputs} ${s.emergency}`}>
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
        </Section>
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

const Section = ({ title, children }) => {
  const [show, setShow] = useState(false)
  return (
    <section className={s.form_box}>
      <h3 className={s.title} onClick={() => setShow(!show)}>
        {title}
        {show ? <DownIcon /> : <ForwardIcon />}
      </h3>
      {show && children}
    </section>
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
  for (let i = 17; i < 20; i++) {
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

const Records = ({ records = [], handleRemoveRecord }) => {
  console.log('records', records)
  
  return (
    <>
      {records?.map(({ date, test, time, place }) => (
        <div className={s.record_row}>
          <div className={s.record_cell}>
            {format(new Date(date.toString()), 'dd/MMM/yy')}
          </div>
          <div className={s.record_cell}>{test}</div>
          <div className={s.record_cell}>{time}</div>
          <div className={s.record_cell}>{place}</div>
          <div className={s.record_cell}>
            <Button
              icon
              danger
              onClick={(e) => {
                e.preventDefault()
                handleRemoveRecord({ date, test })
              }}
            >
              <TrashBinIcon size=".8rem" />
            </Button>
          </div>
        </div>
      ))}
    </>
  )
}
