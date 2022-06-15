import { useState } from 'react'
import { createTeam, updateTeam } from '@/firebase/teams'

import ButtonSave from '@comps/Inputs/Button/ButtonSave'
import TextInput from '@comps/Inputs/TextInput'
import { useForm } from 'react-hook-form'
import { useUser } from '@/context/UserContext'
import Toggle from '@comps/Inputs/Toggle'
import { useRouter } from 'next/router'
import TextArea from '@comps/Inputs/TextArea'
import InputDate from '../../Inputs/InputDate'
import InputFile from '../../Inputs/InutFile'
import { FirebaseCRUD } from '@/firebase/FirebaseCRUD'
// TODO Add fields: image, schedule, place, 
export default function TeamForm({ team }) {
  const { user } = useUser()
  const router = useRouter()
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitSuccessful, isSubmitting, isDirty }
  } = useForm({
    defaultValues: team
  })
  console.log(watch('isPublic'))
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

  const handleUploadFile = ({ fileName, file }) => {
    FirebaseCRUD.uploadFile({ fileName, file }, (progress, downloadURL) => {
      setImageProgress(progress)
      setValue('image', downloadURL)
    })
    console.log(fileName, file)
  }
  const [imageProgress, setImageProgress] = useState(null)

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="grid justify-center  relative">
        <div className="flex justify-between my-4 sticky top-8 w-full bg-base-100">
          <Toggle {...register('isPublic')} label="Equipo público" />
          <ButtonSave loading={isSubmitting} saved={isSubmitSuccessful} />
        </div>
        <TextInput {...register('name')} label="Nombre del equipo" />
        <TextArea  {...register('description')} label="descripción" />
        {/*   <InputDate  {...register('dates.startAt')} /> */}
        <InputFile label='Imagen de equipo:' onUpload={handleUploadFile} progress={imageProgress} preview={watch('image')} />
      </div>
    </form>
  )
}
