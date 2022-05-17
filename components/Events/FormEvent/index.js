// import Button from '@/legasy/src/components/inputs/Button'
import { useForm } from 'react-hook-form'
// import { yupResolver } from '@hookform/resolvers/yup/dist/yup'
import * as yup from 'yup'
//import { createOrUpdateEvent, updateEvent } from '@/legasy/firebase/events'
import { useRouter } from 'next/router'
//import { useAuth } from '@/legasy/src/context/AuthContext'
// import { formatInputDate } from '@/legasy/src/utils/Dates'
// import  from '@/legasy/src/components/inputs/UploadImage'
import Image from 'next/image'
import { useState } from 'react'
// import UploadFile from '@/legasy/src/components/inputs/UploadFile'
// import { ROUTES } from '@/legasy/ROUTES'
// import PickerTests from '@/legasy/src/components/inputs/PickerTests'

import { useUser } from '@/context/UserContext'
import { ROUTES } from '@/CONSTANTS/ROUTES'
import PickerTests from '@comps/Inputs/PickerTests'
import Button from '@comps/Inputs/Button'
import { submitEvent } from '@/firebase/events'
import { uploadFile } from '@/firebase/uploadImage'
import File from '@comps/Inputs/file'
const schema = yup
  .object({
    title: yup.string().required(),
    date: yup.string().required()
  })
  .required()

export default function FormEvent({ event }) {
  const router = useRouter()
  const {
    handleSubmit,
    register,
    setValue,
    watch,
    formState: { errors, isDirty }
  } = useForm({
    // resolver: yupResolver(schema),
    defaultValues: { ...event }
  })
  const onSubmit = (form) => {
    submitEvent({ ...form })
      .then(({ ok, res }) => {
        if (ok && res) {
          router.push(`${ROUTES.EVENTS.href}/${res.id}`)
        }
      })
      .catch((err) => console.log(`err`, err))
  }

  const handleSetValue = (fieldName, fieldValue) => {
    setValue(fieldName, fieldValue, { shouldDirty: true })
  }

  const handleSetTests = (tests) => {
    handleSetValue('tests', tests)
  }

  const handleUploadFile = async ({ fieldName, file }) => {
    uploadFile(file, `places/${fieldName}s/`, (progress, downloadURL) => {
      if (downloadURL) {
        handleSetValue(fieldName, downloadURL)
      }
    });
  }


  return (
    <div className="max-w-sm mx-auto p-2 grid gap-2 relative">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className=" flex justify-end py-2 sticky top-0 z-10  mb-2 bg-base-300">
          <Button size='sm' type="submit" label="Guardar" variant='info' disabled={!isDirty} />
        </div>

        <div className="grid gap-2">
          <label>
            Evento público
            <input
              className="bg-secondary-dark p-1"
              {...register('publicEvent')}
              type="checkbox"
            />
          </label>
          <div>
            <h3>Estatus del evento</h3>
            <div className="grid gap-2 grid-flow-col">
              <label>
                En marcha
                <input
                  onChange={() => handleSetValue('status', 'RUNNING')}
                  checked={watch().status === 'RUNNING'}
                  type="checkbox"
                ></input>
              </label>
              <label>
                Lleno
                <input
                  onChange={() => handleSetValue('status', 'FULL')}
                  checked={watch().status === 'FULL'}
                  type="checkbox"
                ></input>
              </label>
              <label>
                Cancelado
                <input
                  onChange={() => handleSetValue('status', 'CANCEL')}
                  checked={watch().status === 'CANCEL'}
                  type="checkbox"
                ></input>
              </label>
              <label>
                Finalizado
                <input
                  onChange={() => handleSetValue('status', 'FINISH')}
                  checked={watch().status === 'FINISH'}
                  type="checkbox"
                ></input>
              </label>
            </div>
          </div>
          <input className="bg-secondary-dark p-1 text-black " {...register('title')} />
          <textarea
            rows={10}
            className=" p-1 resize-none  text-black"
            {...register('description')}
          />
          <input className="bg-secondary-dark p-1 text-black" {...register('date')} type="date" />
          <div></div>
        </div>
        <div>
          <div>
            <h3 className="text-center text-xl font-bold">Pruebas</h3>
            <PickerTests tests={event?.tests} setTests={handleSetTests} />
          </div>
          {/* ---------------- SUBIR IMAGEN */}
          <div>
            <label className="flex justify-center items-center">

              <File onChange={({ target: { files } }) => handleUploadFile({ fieldName: 'image', file: files[0] })} label={'Imagen'} />

            </label>
            <div className="relative aspect-video mt-2 ">
              {watch('image') && (
                <Image src={watch('image')} layout="fill" objectFit="cover" />
              )}
            </div>
          </div>
        </div>

      </form>
    </div>
  )
}
