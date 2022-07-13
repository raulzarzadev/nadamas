import { useForm } from "react-hook-form"
import TextArea from "../../../Inputs/TextArea"
import TextInput from "../../../Inputs/TextInput"
import { createPost, editPost } from '@/firebase/posts/main'
import { FirebaseCRUD } from '@/firebase/FirebaseCRUD'
import InputFile from "../../../Inputs/InutFile"
import { useState } from "react"
import Toggle from "../../../Inputs/Toggle"
import ButtonSave from "../../../Inputs/Button/ButtonSave"
import RadioInput from "../../../Inputs/Radio"
import Icon from "../../../Icon"
import Tooltip from "../../../Tooltip"

const FormPost = ({ team, post }) => {
  const { register, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: post
  })

  const onSubmit = (data) => {
    post?.id
      ?
      editPost(post?.id, data)
        .then((res) => {
          console.log(res)
        }).catch(err => {
          console.log(err)
        })
      :
      createPost({
        ...data,
        teamId: team.id,
      })
        .then(({ ok, res }) => {
          console.log(res)

          if (ok) {
            setSaved(true)
            // reset()
          }
        }).catch(err => {
          console.log(err)
        })

  }

  const [saved, setSaved] = useState(false)

  const [imageProgress, setImageProgress] = useState(null)
  const handleUpdateImage = ({ fileName, file }) => {
    FirebaseCRUD.uploadFile({ fileName, file }, (progress, url) => {
      setImageProgress(progress)
      setValue('image', url)
    })
  }
  return (
    <div >
      <form id='form-new-post' onSubmit={handleSubmit(onSubmit)} className='' >
        <div className="flex justify-between items-center my-4 sticky top-8 left-0 right-0 bg-base-100 py-1 z-20">
          <Toggle  {...register('isPublic')} label="Publico" size='lg' />
          <ButtonSave id='submit-new-post' size='md' saved={saved} />
        </div>
        <h4>Tipo de post:</h4>
        <div className="flex justify-around">
          <RadioInput
            value='info'

            label={<Tooltip element={<Icon name='info' />} label='Información' />}
            {...register('type')} {...register('type')}
          />
          <RadioInput
            value='workout'

            label={<Tooltip element={<Icon name='workout' />} label='Entreno' />}

            {...register('type')}
          />
          <RadioInput
            value='event'
            label={<Tooltip element={<Icon name='event' />} label='Evento' />}

            {...register('type')} {...register('type')}
          />
        </div>
        <TextInput label='Titulo' {...register('title')} />
        <TextArea label='Contenido' {...register('content')} />
        <InputFile label='Imagen' onUpload={handleUpdateImage} progress={imageProgress} preview={watch('image')} />
      </form>
    </div>
  )
}

export default FormPost
