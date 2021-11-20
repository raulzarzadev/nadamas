import Button from '@comps/inputs/Button'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup/dist/yup'
import * as yup from 'yup'
import { createOrUpdateEvent, updateEvent } from '@/firebase/events'
import { useRouter } from 'next/router'
import { useAuth } from '@/src/context/AuthContext'
import { formatInputDate } from '@/src/utils/Dates'
import UploadImage from '@comps/inputs/UploadImage'
import Image from 'next/image'
import { useState } from 'react'
import UploadFile from '@comps/inputs/UploadFile'
import { ROUTES } from '@/ROUTES'
import PickerTests from '@comps/inputs/PickerTests'
const schema = yup
  .object({
    title: yup.string().required(),
    date: yup.string().required()
  })
  .required()

export default function FormEvent({ event, discard = () => {} }) {
  const { user } = useAuth()
  const router = useRouter()
  const {
    handleSubmit,
    register,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: event
      ? { ...event, date: formatInputDate(event?.date) }
      : null
  })
  const onSubmit = (form) => {
    createOrUpdateEvent({ ...form, owner: { id: user?.id, name: user?.name } })
      .then(({ res }) => {
        console.log(`res`, res)
        router.push(ROUTES.events.details(res.id))
      })
      .catch((err) => console.log(`err`, err))
  }

  const handleDiscard = (e) => {
    reset()
    discard()
  }
  console.log(`watch()`, watch())

  return (
    <div className="max-w-sm mx-auto p-2 grid gap-2 relative">
     
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className=" grid grid-flow-col grid-cols-2 gap-3 py-3 sticky top-0 z-10 bg-gray-700 mb-2">
          {discard && (
            <Button
              variant="secondary"
              label="Descartar cambios"
              type="button"
              onClick={handleDiscard}
            />
          )}
          <Button type="submit" label="Guardar" />
        </div>

        <div className="grid gap-2">
          <label>
            Evento público
            <input
              className="bg-gray-600"
              {...register('publicEvent')}
              type="checkbox"
            />
          </label>
          <div>
            <h3>Estatus</h3>
            <div className="grid gap-2 grid-flow-col">
              <label>
                En marcha
                <input
                  onChange={() => setValue('status', 'RUNNING')}
                  checked={watch().status === 'RUNNING'}
                  type="checkbox"
                ></input>
              </label>
              <label>
                Lleno
                <input
                  onChange={() => setValue('status', 'FULL')}
                  checked={watch().status === 'FULL'}
                  type="checkbox"
                ></input>
              </label>
              <label>
                Cancelado
                <input
                  onChange={() => setValue('status', 'CANCEL')}
                  checked={watch().status === 'CANCEL'}
                  type="checkbox"
                ></input>
              </label>
              <label>
                Finalizado
                <input
                  onChange={() => setValue('status', 'FINISH')}
                  checked={watch().status === 'FINISH'}
                  type="checkbox"
                ></input>
              </label>
            </div>
          </div>
          <input className="bg-gray-600" {...register('title')} />
          <textarea
            rows={10}
            className="bg-gray-600 resize-none"
            {...register('description')}
          />
          <input className="bg-gray-600" {...register('date')} type="date" />
          <div></div>
        </div>
      </form>
      {event?.id && (
        <AlreadySaved
          event={event}
          eventId={event?.id}
          image={event?.image}
          announcement={event?.announcement}
        />
      )}
    </div>
  )
}
const AlreadySaved = ({ event, eventId, image, announcement }) => {
  const [newImage, setNewImage] = useState(null)
  const [newAnnouncement, setNewAnnouncement] = useState(null)
  const imageUploaded = (url) => {
    updateEvent({ id: eventId, image: url })
      .then((res) => {
        setNewImage(url)
      })
      .catch((err) => console.log(`err`, err))
  }
  const fileUploaded = (url) => {
    updateEvent({ id: eventId, announcement: url })
      .then((res) => {
        setNewAnnouncement(url)
      })
      .catch((err) => console.log(`err`, err))
  }

  const fileDeleted = () => {
    updateEvent({ id: eventId, announcement: null })
      .then((res) => {
        setNewAnnouncement(null)
      })
      .catch((err) => console.log(`err`, err))
  }

  const handleSetTests = (tests) => {
    updateEvent({ id: eventId, tests })
      .then((res) => console.log(`res`, res))
      .catch((err) => console.log(`err`, err))
  }

  return (
    <div>
      <div>
        <h3 className="text-center text-xl font-bold">Pruebas</h3>
        <PickerTests tests={event?.tests} setTests={handleSetTests} />
      </div>
      {/* ---------------- SUBIR IMAGEN */}
      <div>
        <label className="flex justify-center items-center">
          <div className="mr-3 my-2">
            {!!image ? 'Cambiar imagen' : 'Subir imagen'}
          </div>
          <UploadImage
            storeRef={`/events/${eventId}/images`}
            upladedImage={imageUploaded}
          />
        </label>
        <div className="relative w-full h-20">
          {image && (
            <Image src={newImage || image} layout="fill" objectFit="cover" />
          )}
        </div>
      </div>
      {/* ---------------- SUBIR CONVOCATORIA */}
      <label className="flex justify-center items-center">
        <div className="mr-3 my-2">
          {!!announcement ? 'Cambiar convocatoria' : 'Subir convocatoria'}
        </div>
        <UploadFile
          file={announcement}
          storeRef={`/events/${eventId}/files`}
          fileUploaded={fileUploaded}
          fileDeleted={fileDeleted}
        />
      </label>
      <div>
        {(announcement || newAnnouncement) && (
          <embed
            src={announcement || newAnnouncement}
            className="w-full h-96"
          />
        )}
      </div>
    </div>
  )
}
