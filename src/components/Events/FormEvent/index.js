import Button from '@comps/inputs/Button'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup/dist/yup'
import * as yup from 'yup'
import { createOrUpdateEvent, updateEvent } from '@/firebase/events'
import { useRouter } from 'next/router'
import { useAuth } from '@/src/context/AuthContext'
import { format, formatInputDate } from '@/src/utils/Dates'
import { ROUTES } from '@/ROUTES'
import UploadImage from '@comps/inputs/UploadImage'

const schema = yup
  .object({
    title: yup.string().required(),
    date: yup.string().required()
  })
  .required()

export default function FormEvent({ event, discard = () => {} }) {
  console.log(`event`, event)
  const router = useRouter()
  const { user } = useAuth()

  const {
    handleSubmit,
    register,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { ...event, date: formatInputDate(event?.date) }
  })
  const onSubmit = (form) => {
    createOrUpdateEvent({ ...form, owner: { id: user.id, name: user.name } })
      .then((res) => {
        console.log(`res`, res)
        //router.push(ROUTES.events.details())
      })
      .catch((err) => console.log(`err`, err))
  }
  console.log(`watch()`, watch())

  const handleDiscard = (e) => {
    reset()
    discard()
  }

  return (
    <div className="max-w-sm mx-auto p-2 grid gap-2">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-2">
          <label>
            Evento público
            <input
              className="bg-gray-600"
              {...register('publicEvent')}
              type="checkbox"
            />
          </label>
          <input className="bg-gray-600" {...register('title')} />
          <textarea
            rows={5}
            className="bg-gray-600 resize-none"
            {...register('description')}
          />
          <input className="bg-gray-600" {...register('date')} type="date" />
          {event.id && <AlreadySaved eventId={event.id} />}

          <Button type="submit" label="Guardar" />
        </div>
      </form>
      {discard && (
        <Button
          variant="secondary"
          label="Descartar cambios"
          type="button"
          onClick={handleDiscard}
        />
      )}
    </div>
  )
}
const AlreadySaved = ({ eventId }) => {
  const imageUploaded = (url) => {
    console.log(`url`, url)
    updateEvent({ id: eventId, image: url })
      .then((res) => console.log(`res`, res))
      .catch((err) => console.log(`err`, err))
  }
  return (
    <div>
      <label>Convocatoria</label>
      <label>
        Subir imagen
        <UploadImage
          storeRef={`/events/${eventId}`}
          upladedImage={imageUploaded}
        />
      </label>
    </div>
  )
}
