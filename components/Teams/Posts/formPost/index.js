import { useForm } from "react-hook-form"
import TextArea from "../../../Inputs/TextArea"
import TextInput from "../../../Inputs/TextInput"
import { createPost, editPost } from '@/firebase/posts/main'
import { FirebaseCRUD } from '@/firebase/FirebaseCRUD'
import InputFile from "../../../Inputs/InutFile"
import { useState } from "react"
import Toggle from "../../../Inputs/Toggle"
const FormPost = ({ team, post }) => {
  const { register, handleSubmit, watch, setValue } = useForm({
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
        .then((res) => {
          console.log(res)
        }).catch(err => {
          console.log(err)
        })

  }
  const [imageProgress, setImageProgress] = useState(null)
  const handleUpdateImage = ({ fileName, file }) => {
    console.log(fileName, file)
    FirebaseCRUD.uploadFile({ fileName, file }, (progress, url) => {
      console.log(progress, url)
      setImageProgress(progress)
      setValue('image', url)
    })
  }
  return (
    <div >
      <form onSubmit={handleSubmit(onSubmit)} className='relative' >
        <div className="flex justify-between my-4 sticky top-8 left-0 right-0 z-10 bg-base-100 py-1">
          <button className="btn btn-primary ">
            Guardar
          </button>

        </div>
        <Toggle {...register('isPublic')} label="Publicación visible para todo el mundo"  size='lg'/>
        <InputFile label='Imagen' onUpload={handleUpdateImage} progress={imageProgress} preview={watch('image')} />
        <TextInput label='Titulo' {...register('title')} />
        <TextArea label='Contenido' {...register('content')} />
      </form>
    </div>
  )
}

export default FormPost
