import { useState } from 'react'
import { createTeam, updateTeam } from '@/firebase/teams'
import ButtonSave from '@comps/Inputs/Button/ButtonSave'
import TextInput from '@comps/Inputs/TextInput'
import { useForm } from 'react-hook-form'
import { useUser } from '@/context/UserContext'
import Toggle from '@comps/Inputs/Toggle'
import { useRouter } from 'next/router'
import TextArea from '@comps/Inputs/TextArea'

// TODO Add fields: image, schedule, place, 
export default function TeamForm({ team }) {
  const { user } = useUser()
  const router = useRouter()
  const {
    register,
    handleSubmit,
    reset,
    watch,

    formState: { isSubmitSuccessful, isSubmitting, isDirty }
  } = useForm({
    defaultValues: team
  })
  const onSubmit = (form) => {
    team?.id
      ? updateTeam(form).then((res) => {
          console.log(res)
          // reset({ keepValues: true, keepIsSubmitted: true })
        })
      : createTeam(form, user).then(({ ok, res }) => {
          reset({ keepValues: true, keepIsSubmitted: true })
          ok && router.push(`/teams/${res.id}`)
        })

    // console.log(form)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="grid justify-center ">
        <TextInput {...register('name')} label="Nombre del equipo" />
        <TextArea  {...register('description')} label="descripción" />
        <Toggle {...register('isPublic')} label="Equipo público" />
        <div className="flex justify-center my-4">
          <ButtonSave loading={isSubmitting} saved={isSubmitSuccessful} />
        </div>
      </div>
    </form>
  )
}
