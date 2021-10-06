import { useEffect, useState } from 'react'
import Button from '@comps/inputs/Button'

import { useRouter } from 'next/router'
import { formatInputDate } from '../../utils/Dates'
import {
  SaveIcon,
  ForwardIcon,
  DownIcon,
  ContactIcon,
  EmailIcon
} from '../../utils/Icons'
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
import Autocomplete from '@comps/inputs/TextAutocomplete'
import BLOD_TYPES from '@/src/constants/BLOD_TYPES'
import Toggle from '@comps/inputs/Toggle'
import Section from '@comps/Section'
import Payments from './Payments'

const SAVE_BUTTON_LABEL = {
  NEW: 'Guardar',
  EXIST: 'Guardado',
  DIRTY: 'Guardar'
}
export default function NewAthlete() {
  const { user } = useAuth()
  const id = router?.query?.id
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
  const [formStatus, setFormStatus] = useState(null)
  const [dirtyForm, setDirtyForm] = useState(false)

  useEffect(() => {
    if (id) {
      setFormStatus('EXIST')
    } else if (!id) {
      setFormStatus('NEW')
    }
    if (dirtyForm) {
      setFormStatus('DIRTY')
    }
  }, [id, dirtyForm])

  const [form, setForm] = useState({
    birth: new Date(),
    records: []
  })

  const handleChange = (e) => {
    setDirtyForm(true)
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleChangeTaggle = (e) => {
    setDirtyForm(true)
    setForm({ ...form, [e.target.name]: e.target.checked })
  }

  const handleSubmit = async () => {
    const res = await updateAtlete({ ...form, active: true, userId: user.id })
    if (res?.type === 'ATHLETE_CREATED') {
      setDirtyForm(false)
      router.push(`/athletes/${res?.id}`)
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
    setDirtyForm(true)
    setForm({ ...form, avatar: url })
    updateAtlete({ ...form, avatar: url })
  }
  const wstext = ''

  return (
    <div className="relative pt-0 pb-8 max-w-lg mx-auto">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSubmit()
        }}
        className=""
      >
        <div className="flex justify-center">
          {!form?.avatar && (
            <div className=" bottom-0 right-0 flex">
              <div className="mx-2">Sube una foto</div>
              <UploadImage
                upladedImage={upladedImage}
                storeRef={`avatar/${form?.id}`}
              />
            </div>
          )}
          {form?.avatar && (
            <div className=" hidden sm:block relative">
              <Avatar upload id={form.id} image={form?.avatar} />
              <div className="absolute bottom-0 right-0">
                <UploadImage
                  upladedImage={upladedImage}
                  storeRef={`avatar/${form?.id}`}
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
                  storeRef={`avatar/${form?.id}`}
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
        <div className="sticky top-0 bg-gray-700 z-10 p-2 flex justify-between  ">
          <div className="m-2">
            <Button
              size="sm"
              disabled={!form?.mobile}
              icon
              href={`https://wa.me/521${form?.mobile}?text=${wstext}`}
            >
              <ContactIcon />
            </Button>
          </div>
          <div className="m-2">
            <Button
              size="sm"
              disabled={!form?.email}
              icon
              href={`mailto:${form?.email}?subject=Natación`}
            >
              <EmailIcon />
            </Button>
          </div>
          <div className=" w-40  ">
            <Button disabled={formStatus === 'NEW'} variant="social">
              {SAVE_BUTTON_LABEL[formStatus]}
              <SaveIcon />
            </Button>
          </div>
        </div>
        {/* ----------------------------------------------Actions  */}
        <div className="flex w-full justify-evenly "></div>
        {/* ----------------------------------------------Personal information */}
        <div className="  ">
          <div className="p-2 sm:p-6 grid gap-2">
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
            <Textarea
              value={form?.goals}
              onChange={handleChange}
              name="goals"
              rows={2}
              label="¿Proposito o espectativa? (Opcional)"
            />
            <div className="flex items-center w-full">
              <Text
                value={formatInputDate(form?.birth)}
                onChange={handleChange}
                name="birth"
                label="Fecha de nacimiento"
                type="date"
              />
              <div className="mx-2">
                <Toggle
                  label="Compartir"
                  name="showBirthday"
                  labelPosition="top"
                  checked={form?.showBirthday || false}
                  onChange={handleChangeTaggle}
                />{' '}
              </div>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------Tests */}

        <Section title={'Pruebas'}>
          {form?.id ? (
            <Records athlete={form} />
          ) : (
            <Info
              fullWidth
              text="Primero guarda. Debes guardar antes de crear registros"
            />
          )}
        </Section>

        {/* ----------------------------------------------Pyments */}

        <Section title="Cuotas">
          <Payments athleteId={form?.id} />
        </Section>

        {/* ----------------------------------------------Schedule */}

        <Section title={'Horario'} open>
          {form?.id ? (
            <Schedule athleteId={form?.id} athlete={form} />
          ) : (
            <Info
              fullWidth
              text="Primero guarda. Debes guardar antes de asignar un horario"
            />
          )}
        </Section>

        {/* ----------------------------------------------Contact */}

        <Section title={'Contacto'} open>
          <div className={`flex flex-col p-1`}>
            <div className="my-1">
              <Text
                onChange={handleChange}
                value={form?.mobile}
                name="mobile"
                type="tel"
                label="Celular"
              />
            </div>
            <div className="my-1">
              <Text
                onChange={handleChange}
                value={form?.email}
                name="email"
                label="email"
                label="Correo"
              />
            </div>
          </div>
        </Section>

        {/* ----------------------------------------------Medic information */}

        <Section title={'Información médica'} open>
          <div className={s.medic_info}>
            <Autocomplete
              value={form?.blodType}
              placeholder={'Tipo de Sangre'}
              items={BLOD_TYPES}
              onChange={handleChange}
              name="blodType"
              onSelect={(e) => setForm({ ...form, blodType: e })}
            />
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

        {/* ----------------------------------------------Emergency contact */}

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
