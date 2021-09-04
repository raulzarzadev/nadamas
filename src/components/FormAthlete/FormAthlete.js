import { useEffect, useState } from 'react'
import Button from '@comps/inputs/Button'

import { useRouter } from 'next/router'
import { formatInputDate } from '../../utils/Dates'
import { SaveIcon, ForwardIcon, DownIcon } from '../../utils/Icons'
import Avatar from '../Avatar'
import DeleteModal from '../Modals/DeleteModal'
import { useAuth } from '../../context/AuthContext'
import { Schedule } from './Schedule'
import UploadImage from '../inputs/UploadImage'
import Text from '@comps/inputs/Text'
import Textarea from '@comps/inputs/Textarea'
import Image from 'next/image'
import Records from './Records'
import Info from '@comps/Alerts/Info'
import { getAthlete, updateAtlete } from '@/firebase/athletes'
import s from './styles.module.css'

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
      router.push(`/athletes/${res.id}`)
    }
  }

  const handleDelete = () => {
    updateAtlete({ id: updatingAthlete, active: false })
    setTimeout(() => {
      router.back()
    }, 400)
  }
  const [openDelete, setOpenDelete] = useState(false)
  const handleOpenDelete = () => {
    setOpenDelete(!openDelete)
  }

  const upladedImage = (url) => {
    setForm({ ...form, avatar: url })
    updateAtlete({ ...form, avatar: url })
  }

  return (
    <div className="pt-4 pb-8 max-w-lg mx-auto">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSubmit()
        }}
        className="relative"
      >
        <div className="  ">
          <h2 className="text-sm text-right font-bold">Atleta</h2>
          <div className="flex justify-center">
            {!form?.avatar && (
              <div className=" bottom-0 right-0 flex">
                <div className="mx-2">Sube una foto</div>
                <UploadImage
                  upladedImage={upladedImage}
                  storeRef={`avatar/${form.id}`}
                />
              </div>
            )}
            {form?.avatar && (
              <div className=" hidden sm:block relative">
                <Avatar upload id={form.id} image={form?.avatar} />
                <div className="absolute bottom-0 right-0">
                  <UploadImage
                    upladedImage={upladedImage}
                    storeRef={`avatar/${form.id}`}
                  />
                </div>
              </div>
            )}
            {form?.avatar && (
              <div className="w-full h-28 relative sm:hidden">
                <Image src={form?.avatar} layout="fill" objectFit="cover" />
                <div className="absolute bottom-2 right-2">
                  <UploadImage
                    upladedImage={upladedImage}
                    storeRef={`avatar/${form.id}`}
                  />
                </div>
              </div>
            )}
            {/*             {form?.id && (
              <div className="absolute bottom-0 left- ">
                <UploadImage
                  upladedImage={upladedImage}
                  storeRef={`avatar/${form.id}`}
                />
              </div>
            )} */}
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
              label="Fecha de nacimiento"
              type="date"
            />
          </div>
        </div>
        <Section title={'Pruebas'}>
          {form.id ? (
            <Records athlete={form} />
          ) : (
            <Info
              fullWidth
              text="Debes guardar primero a este atleta antes de guardar registros"
            />
          )}
        </Section>
        <Section title="Cuotas">
          <Info fullWidth text="Pronto podras registrar pagos y cuotas aqui" />
        </Section>

        <Section title={'Horario'} open>
          {form.id ? (
            <Schedule athleteId={form.id} athlete={form} />
          ) : (
            <Info
              fullWidth
              text="Debes guardar primero a este atleta antes de asignarle un horario"
            />
          )}
        </Section>
        <Section title={'Contacto'} open>
          <div className={`flex flex-col p-1`}>
            <div className="my-1">
              <Text
                onChange={handleChange}
                value={form.mobile}
                name="mobile"
                type="tel"
                label="Celular"
              />
            </div>
            <div className="my-1">
              <Text
                onChange={handleChange}
                value={form.email}
                name="email"
                label="email"
                label="Correo"
              />
            </div>
          </div>
        </Section>
        <Section title={'Información médica'} open>
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
        <Section title={'Contacto de emergencia'} open>
          <div className={`flex flex-col  p-1`}>
            <div className="my-1">
              <Text
                onChange={handleChange}
                name="emerName"
                value={form?.emerName}
                label="Nombre"
              />
            </div>
            <div className="my-1">
              <Text
                type="tel"
                onChange={handleChange}
                name="emerMobile"
                value={form?.emerMobile}
                label="Teléfono"
              />
            </div>
            <div className="my-1">
              <Text
                onChange={handleChange}
                name="emerTitle"
                value={form?.emerTitle}
                label="Perentesco"
              />
            </div>
          </div>
        </Section>
        <div className=" w-40 mx-auto my-8">
          <Button variant="social">
            Guardar
            <SaveIcon />
          </Button>
        </div>
      </form>
      {form?.id && (
        <div className="p-4 w-40 mx-auto mt-20 ">
          <Button variant="danger" onClick={handleOpenDelete}>
            Eliminar
          </Button>
        </div>
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
