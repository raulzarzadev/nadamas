import { useState } from 'react'
import { createTeam } from '@/firebase/teams'
import ButtonSave from '@comps/Inputs/Button/ButtonSave'
import TextInput from '@comps/Inputs/TextInput'
import { useForm } from 'react-hook-form'
import { useUser } from '@/context/UserContext'

export default function TeamForm({ team }) {
  const { user } = useUser()
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitSuccessful, isSubmitting, isDirty }
  } = useForm({
    defaultValues: team
  })
  const onSubmit = (form) => {
    createTeam(form, user).then((res) => {
      reset({ keepValues: true, keepIsSubmitted: true })
    })
    // console.log(form)
  }
  console.log('isSubmitting', isSubmitting)
  console.log('isDirty', isDirty)
  return (
    <div className="">
      <form onSubmit={handleSubmit(onSubmit)}>
        <TextInput {...register('name')} label="Nombre del equipo" />
        <TextInput {...register('description')} label="descripción" />
        <div className="flex justify-center my-4">
          <ButtonSave loading={isSubmitting} saved={isSubmitSuccessful} />
        </div>
      </form>
    </div>
  )
}
