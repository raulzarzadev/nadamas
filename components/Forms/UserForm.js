import { updateUser } from '@/firebase/users'
import { dateFormat } from '@/utils/dates'
import Button from '@comps/Inputs/Button'
import TextInput from '@comps/Inputs/TextInput'
import Loading from '@comps/Loading'
import Section from '@comps/Section'
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
      displayName: user.name
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
        <Section title="Informacion personal " open indent={false}>
          <TextInput
            label={'Nombre'}
            placeholder="Nombre"
            //  error={errors.name.message}
            {...register('displayName')}
          />
          <TextInput
            label={'Alias publico (opcional)'}
            placeholder="Alias (opcional)"
            //  error={errors.name.message}
            {...register('alias')}
          />
          <TextInput
            label={'Fecha de nacimiento'}
            type="date"
            //  error={errors.name.message}
            {...register('birth')}
          />
        </Section>

        <Section title="Contacto " open indent={false}>
          <TextInput
            label={'Telefono'}
            placeholder="Telefono (opcional)"
            //  error={errors.name.message}
            {...register('contact.phone')}
          />
          <TextInput
            label={'Correo'}
            placeholder="Email (recomendado)"
            //  error={errors.name.message}
            {...register('contact.email')}
          />
        </Section>

        <Section title="Informacion Médica "  indent={false}>
          <TextInput
            label={'Tipo de sangre'}
            placeholder=" (recomendado)"
            //  error={errors.name.message}
            {...register('medicInformation.blodType')}
          />
          <TextInput
            label={'Consideraciones medicas'}
            placeholder=" (recomendado)"
            helperText={
              'Lesiones, alergias, condiciones, enfermedades, medicamentos, etc.'
            }
            //  error={errors.name.message}
            {...register('medicInformation.considerations')}
          />
          
        </Section>

        <Section title="Contacto de Emergencia"  indent={false}>
          <TextInput
            label={'Nombre'}
            placeholder="(recomendado)"
            //  error={errors.name.message}
            {...register('emergencyContact.name')}
          />
          <TextInput
            label={'Telefono'}
            placeholder="(recomendado)"
            //  error={errors.name.message}
            {...register('emergencyContact.phone')}
          />
          <TextInput
            label={'Parentesco'}
            placeholder=" (recomendado)"
            {...register('emergencyContact.relationship')}
          />
        </Section>

        <Button>Guardar</Button>
      </form>
    </div>
  )
}
