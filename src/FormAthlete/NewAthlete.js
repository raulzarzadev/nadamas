import { useEffect, useState } from 'react'
import Button from '../Button'
import s from './styles.module.css'
import {
  getAthlete,
  updateAtlete,
  createRecord,
  getRecords,
  removeRecord
} from '@/firebase/client'
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
import UploadFile from '../UploadFile'
import { useAuth } from '../context/AuthContext'
import { Records } from './Records'
import { Schedule } from './Schedule'

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

  const { user } = useAuth()

  const handleSubmit = async () => {
    const res = await updateAtlete({ ...form, active: true, userId: user.id })
    if (res.type === 'ATHLETE_CREATED') {
      router.push(`/atletas/${res.id}`)
    }
    console.log('res', res)
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
  const [records, setRecords] = useState([])
  const handleSetRecord = (e) => {
    const { name, value } = e.target
    setRecord({ ...record, [name]: value })
  }

  const handleAddRecord = () => {
    createRecord({ athleteId: form.id, ...record })
    getRecords(form.id).then(setRecords)
  }

  const handleRemoveRecord = (recordId) => {
    removeRecord(recordId)
    getRecords(form.id).then(setRecords)
  }
  useEffect(() => {
    if (form.id) {
      getRecords(form.id).then(setRecords)
    }
  }, [form.id])

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
            <div className={s.avatar}>
              <Avatar upload athleteId={form.id} image={form?.avatar} />
            </div>
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
        <Section title={'Marcas y Registros'}>
          <Records records={records} handleRemoveRecord={handleRemoveRecord} />
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

            <Button
              primary
              p="sm"
              onClick={(e) => {
                e.preventDefault()
                handleAddRecord()
              }}
            >
              <AddIcon />
            </Button>
          </div>
        </Section>

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


