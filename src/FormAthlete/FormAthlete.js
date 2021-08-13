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
import { formatInputDate } from '../utils/Dates'
import {
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
import { useAuth } from '../context/AuthContext'
import { Records } from './Records'
import { Schedule } from './Schedule'
import UploadImage from '../UploadImage'

export default function NewAthlete() {
  const { user } = useAuth()
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
    records: []
  })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }


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

  const initalRecordState = {
    place: 'CREA',
    date: new Date()
  }

  const [record, setRecord] = useState(initalRecordState)
  const [records, setRecords] = useState([])
  const handleSetRecord = (e) => {
    const { name, value } = e.target
    setRecord({ ...record, [name]: value })
  }

  const handleAddRecord = () => {
    createRecord({ athleteId: form.id, ...record })
    setRecord(initalRecordState)
    getRecords(form.id)
      .then(setRecords)
      .catch((err) => console.log('err', err))
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

  const upladedImage = (url) => {
    setForm({ ...form, avatar: url })
    updateAtlete({ ...form, avatar: url })
  }

  return (
    <div className="pt-4 pb-8">
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
          <div>
            <h2 className="py-4 text-2xl text-center">Atleta</h2>
            <div className={s.avatar}>
              {form?.id && <Avatar upload id={form.id} image={form?.avatar} />}
              {form?.id && (
                <UploadImage
                  upladedImage={upladedImage}
                  storeRef={`avatar/${form.id}`}
                />
              )}
            </div>
          </div>
          <div className={s.inputs}>
            <Text
              value={form?.name}
              onChange={handleChange}
              name="name"
              label="Nombre(s)"
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
          <div className={s.new_record}>
            <div>
              <Text
                onChange={handleSetRecord}
                name="date"
                type="date"
                value={formatInputDate(record?.date)}
                label="Fecha"
              />
            </div>
            <div>
              <Text
                onChange={handleSetRecord}
                name="place"
                value={record?.place}
                label="Lugar"
              />
            </div>
            <div>
              <Text
                onChange={handleSetRecord}
                name="test"
                value={record?.test}
                label="Prueba"
              />
            </div>
            <div>
              <Text
                onChange={handleSetRecord}
                name="time"
                type="number"
                value={record?.time}
                label="Tiempo"
              />
            </div>
            <div style={{ width: '90%' }}>
              <Button
                fullwidth
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
          </div>
        </Section>

        <Section title={'Horario'} open>
          <Schedule athleteId={form.id}  />
        </Section>
        <Section title={'Contacto'} open>
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
        <Section title={'Información Médica'} open>
          <div className={s.medic_info}>
            <Text
              onChange={handleChange}
              name="medicine"
              value={form?.medicine}
              label="Medicamentos o vacunas"
            />
            <Textarea
              onChange={handleChange}
              label="Lesiones"
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
        <Section title={'Contacto de Emergencia'} open>
          <div className={`${s.inputs} ${s.emergency}`}>
            <Text
              onChange={handleChange}
              name="emerName"
              value={form?.emerName}
              label="Nombre de pila"
            />
            <Text
              type="tel"
              onChange={handleChange}
              name="emerMobile"
              value={form?.emerMobile}
              label="Teléfono"
            />
            <Text
              onChange={handleChange}
              name="emerTitle"
              value={form?.emerTitle}
              label="Perentesco"
            />
          </div>
        </Section>
      </form>
      {form?.id && (
        <Button p="2" my="md" danger onClick={handleOpenDelete}>
          Eliminar
        </Button>
      )}
      <DeleteModal
        open={openDelete}
        handleDelete={handleDelete}
        name={form?.name}
        handleOpen={handleOpenDelete}
      />
    </div>
  )
}

const Section = ({ title, children, open }) => {
  const [show, setShow] = useState(open || false)
  useState(() => {
    setShow(open)
  }, [open])
  return (
    <section className="my-2 ">
      <h3 className="text-left flex ml-4 mb-4" onClick={() => setShow(!show)}>
        {title}
        {show ? <DownIcon /> : <ForwardIcon />}
      </h3>
      {show && children}
    </section>
  )
}
