import Button from '@comps/inputs/Button'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup/dist/yup'
import * as yup from 'yup'
import { createOrUpdateEvent } from '@/firebase/events'
import { useRouter } from 'next/router'
import { useAuth } from '@/src/context/AuthContext'

const schema = yup
  .object({
    title: yup.string().required(),
    date: yup.string().required()
  })
  .required()

export default function FormEvent() {
  const router = useRouter()
  const { user } = useAuth()
  const {
    handleSubmit,
    register,
    setValue,
    watch,
    formState: { errors }
  } = useForm({ resolver: yupResolver(schema) })

  const onSubmit = (form) => {
    createOrUpdateEvent({ ...form, owner: { id: user.id, name: user.name } })
      .then((res) => {
        router.back()
        console.log(`res`, res)
      })
      .catch((err) => console.log(`err`, err))
  }

  return (
    <div className="max-w-sm mx-auto">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-2 p-2">
          <label>
            Evento público
            <input
              className="bg-gray-600"
              {...register('publicEvent')}
              type="checkbox"
            />
          </label>
          <input className="bg-gray-600" {...register('title')} />
          <input className="bg-gray-600" {...register('description')} />
          <input className="bg-gray-600" {...register('date')} type="date" />
          <Button type="submit" label="Guardar" />
        </div>
      </form>
    </div>
  )
}
