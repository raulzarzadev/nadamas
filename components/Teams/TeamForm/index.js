import { useState } from 'react'
import { createTeam, updateTeam } from '@/firebase/teams'

import ButtonSave from '@comps/Inputs/Button/ButtonSave'
import TextInput from '@comps/Inputs/TextInput'
import { useForm } from 'react-hook-form'
import { useUser } from '@/context/UserContext'
import Toggle from '@comps/Inputs/Toggle'
import { useRouter } from 'next/router'
import TextArea from '@comps/Inputs/TextArea'
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
  const [saved, setSaved] = useState(false)
  const onSubmit = (form) => {
    team?.id
      ? updateTeam(form).then(({ok, res}) => {
        if (ok) {
          setSaved(true)
        }
      })
      : createTeam(form, user)
        .then(({ ok, res }) => {
          reset({ keepValues: true, keepIsSubmitted: true })
          if (ok) {
            setSaved(true)
            setTimeout(() => {
              router.push(`/teams/${res.id}`)
            }, 400)
          }
        })

  }


  const handleUploadFile = ({ fileName, file }) => {
    FirebaseCRUD.uploadFile({ fileName, file }, (progress, downloadURL) => {
      setImageProgress(progress)
      setValue('image', downloadURL)
    })
    // console.log(fileName, file)
  }
  const [imageProgress, setImageProgress] = useState(null)

  return (
    <form id='team-form' onSubmit={handleSubmit(onSubmit)}>
      <div className="grid justify-center  relative">
        <div className="flex justify-end my-4 py-1 z-20 sticky top-8 w-full bg-base-100">
          <ButtonSave id='submit-team' loading={isSubmitting} saved={saved} />
        </div>
        <TextInput {...register('name', { required: true })} label="Nombre del equipo" />
        <TextArea  {...register('description')} label="descripción" />
        {/*   <InputDate  {...register('dates.startAt')} /> */}
        <InputFile label='Imagen de equipo:' onUpload={handleUploadFile} progress={imageProgress} preview={watch('image')} />

        <div>
          <h4>Compartir</h4>
          <div className='flex'>
            <TextInput {...register('QRCodes.0.label')} label="Label " placeholder='Visita example' />
            <TextInput {...register('QRCodes.0.value')} label="Link " placeholder='https://ws.link.io' />
          </div>
        </div>
        <Toggle {...register('isPublic')} label="Equipo público" />
        <Toggle {...register('showQRs')} label="Mostrar QR's" />
      </div>
    </form>
  )
}
