import { useForm } from "react-hook-form"
import TextArea from "../../../Inputs/TextArea"
import TextInput from "../../../Inputs/TextInput"
import Toggle from "../../../Inputs/Toggle"
import { createPost } from '@/firebase/posts/main'
const FormPost = ({ team }) => {
  const { register, handleSubmit } = useForm()
  const onSubmit = (data) => {
    createPost({
      ...data,
      teamId: team.id,
    }).then((res) => {
      console.log(res)
    }).catch(err => {
      console.log(err)
    })
   
  }
  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Toggle label='¿Público?' {...register('isPublic')} />
        <TextInput label='Titulo' {...register('title')} />
        <TextArea label='Contenido' {...register('content')} />

        <button>
          Guardar publicacion
        </button>
      </form>
    </div>
  )
}

export default FormPost
