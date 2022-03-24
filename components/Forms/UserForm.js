import { updateUser } from '@/firebase/users'
import { dateFormat } from '@/utils/dates'
import Button from '@comps/Inputs/Button'
import TextInput from '@comps/Inputs/TextInput'
import Loading from '@comps/Loading'
import { useForm } from 'react-hook-form'

export default function UserForm({ user }) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({
    defaultValues: {
      ...user,
      displayName: user.name,
       // birth: dateFormat(user.birth, 'yyyy-MM-dd')
    }
  })

  const onSubmit = (form) => {
    updateUser(form)
      .then((res) => console.log(`res`, res))
      .catch((err) => console.log(`err`, err))
  }

  return (
    <div className="">
      <form onSubmit={handleSubmit(onSubmit)}>
        <TextInput
          label={'Nombre'}
          placeholder="Nombre"
          //  error={errors.name.message}
          helperText="Nombre oficial para competencias"
          {...register('displayName')}
        />
        <TextInput
          label={'Alias'}
          placeholder="Alias (opcional)"
          //  error={errors.name.message}
          helperText="Este alias es publico"
          {...register('alias')}
        />
        <TextInput
          label={'Fecha de nacimiento'}
          type="date"
          //  error={errors.name.message}
          helperText="Determinara tu categoria"
          {...register('birth')}
        />
        <Button>Guardar</Button>
      </form>
    </div>
  )
}
