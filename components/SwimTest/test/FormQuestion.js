import { createQuestion, editQuestion } from '@/firebase/questions/main.ts'
import Icon from '@comps/Icon'
import { useFieldArray, useForm } from 'react-hook-form'

const FormQuestion = ({ testId = null, question = null }) => {
  console.log(question)
  const defaultValues = question || { options: [{ text: '', value: 0 }] }
  // console.log(defaultValues)
  const { register, watch, control, reset } = useForm({
    defaultValues
  })
  const handleSubmit = (newQuestion) => {
    question
      ?
      editQuestion(question?.id, newQuestion)
      :
      createQuestion({ ...newQuestion, testId }).then(res => {
        console.log(res)
        if (res) reset()
      })
  }


  const fieldsArray = useFieldArray({
    control, // control props comes from useForm (optional: if you are using FormContext)
    name: "options", // unique name for your Field Array,
  });


  const LABELS = {
    edit: {
      title: 'Editar pregunta',
      button: 'Editar'
    },
    new: {
      title: 'Nueva pregunta',
      button: 'Guardar'
    }
  }

  const FormType = question ? 'edit' : 'new'



  return (
    <div>
      <h2 className='text-xl font-bold text-center'>
        {LABELS[FormType].title}
      </h2>
      <div className='grid gap-2'>
        <input {...register('text')} className='input input-bordered' placeholder="Question"></input>
        {/* <input {...register('key')} className='input input-bordered' placeholder="key"></input> */}
        <input {...register('multiplier')} type='number' className='input input-bordered' placeholder="0 - 100" max={100} min={0} ></input>
        <h3 className='text-lg font-bold'>
          Opciones
        </h3>
        <FieldArray  {...fieldsArray} register={register} />
        <button className='btn btn-primary mx-auto' onClick={() => {
          handleSubmit(watch())

        }}>
          {LABELS[FormType].button}
        </button>
      </div>
    </div>
  )
}

export default FormQuestion

function FieldArray({ register, fields, append, remove }) {

  const handleRemoveField = (index) => {
    remove(index)
  }


  const handleAddField = () => {
    append({ text: '', value: 0 })
  }




  return (
    <div className='' >
      {fields?.map((field, index) => (
        <div key={field.id} className='flex items-center '>
          <span className='whitespace-nowrap'>
            Opcion {index + 1}:
          </span>
          <input
            className='input  input-bordered w-2/3'
            {...register(`options.${index}.text`)}
          />
          <input
            className='input input-bordered w-1/4'
            type={'number'}
            // important to include key with field's id
            {...register(`options.${index}.value`)}
          />
          <button onClick={() => handleRemoveField(index)}><Icon name='delete' /></button>
        </div>
      ))}
      <div className='flex w-full justify-end my-6'>

        <button className='btn btn-accent btn-sm ' onClick={() => handleAddField()}>Agregar opcion <Icon name='plus' /></button>
      </div>
    </div>
  );
}
