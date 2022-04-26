import { updateUser } from '@/firebase/users'
import ButtonSave from '@comps/Inputs/Button/ButtonSave'
import Phone from '@comps/Inputs/Phone'
import TextInput from '@comps/Inputs/TextInput'
import Toggle from '@comps/Inputs/Toggle'
import Section from '@comps/Section'
import { useForm } from 'react-hook-form'

export default function UserForm({ user }) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue
  } = useForm({
    defaultValues: {
      ...user,
      name: user.displayName,
      // birth: dateFormat(user.birth, 'yyyy-MM-dd')
    }
  })

  const onSubmit = (form) => {
    updateUser(form)
      .then((res) => console.log(`res`, res))
      .catch((err) => console.log(`err`, err))
  }

  console.log(watch());

  return (
    <div className="">
      <form onSubmit={handleSubmit(onSubmit)}>
        <Section title="Informacion personal " open indent={false}>
          <TextInput
            label={'Nombre'}
            placeholder="Nombre"
            //  error={errors.name.message}
            {...register('name', { value: watch('name') || null })}
          />
          <TextInput
            label={'Alias publico (opcional)'}
            placeholder="Alias (opcional)"
            //  error={errors.name.message}
            {...register('alias', { value: watch('alias') || null })}
          />
          <TextInput
            label={'Fecha de nacimiento'}
            type="date"
            //  error={errors.name.message}
            {...register('birth', { value: watch('birth') || null })}
          />
          <Toggle label={'Eres entrenador'} {...register('isCoach')} />
        </Section>

        <Section title="Contacto " open indent={false}>
          <Phone
            label={'Whatsapp'}
            placeholder="Telefono (opcional)"
            //  error={errors.name.message}
            onChange={(value) => {
              setValue('contact.phone', value)
            }}
            value={watch('contact.phone')}
          /* {...register('contact.whatsapp', {
            value: watch('contact.whatsapp') || null
          })} */
          />
          <TextInput
            disabled
            label={'Correo'}
            placeholder="Email (recomendado)"
            onChange={(e) => console.log(e.target.value)}
            //  error={errors.name.message}
            {...register('email', { value: watch('email') || null })}
          />
        </Section>

        <Section title="Informacion Médica " indent={false}>
          <TextInput
            label={'Tipo de sangre'}
            placeholder=" (recomendado)"
            //  error={errors.name.message}
            {...register('medicInformation.blodType', {
              value: watch('medicInformation.blodType') || null
            })}
          />
          <TextInput
            label={'Consideraciones medicas'}
            placeholder=" (recomendado)"
            helperText={
              'Lesiones, alergias, condiciones, enfermedades, medicamentos, etc.'
            }
            //  error={errors.name.message}
            {...register('medicInformation.considerations', {
              value: watch('medicInformation.considerations') || null
            })}
          />
        </Section>

        <Section title="Contacto de Emergencia" indent={false}>
          <TextInput
            label={'Nombre'}
            placeholder="(recomendado)"
            //  error={errors.name.message}
            {...register('emergencyContact.name', {
              value: watch('emergencyContact.name') || null
            })}
          />
          {/* <TextInput
            placeholder="(recomendado)"
            //  error={errors.name.message}
            {...register('emergencyContact.phone', {
              value: watch('emergencyContact.phone') || null
            })}
          /> */}
          <TextInput
            label={'Parentesco'}
            placeholder=" (recomendado)"
            {...register('emergencyContact.relationship', {
              value: watch('emergencyContact.relationship') || null
            })}
          />
          <Phone
            label={'Telefono'}
            placeholder="Telefono (opcional)"
            //  error={errors.name.message}
            onChange={(value) => {
              setValue('emergencyContact.phone', value)
            }} />
        </Section>
        <div className="flex justify-end">
          <ButtonSave />
        </div>
      </form>
    </div>
  )
}
