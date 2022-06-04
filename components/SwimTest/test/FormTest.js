import Icon from '@comps/Icon'
import MainModal from '@comps/Modal/MainModal'
import ModalDelete from '@comps/Modal/ModalDelete'
import { useEffect, useState } from 'react'
import FormQuestion from './FormQuestion'
import { listenUserQuestions, deleteQuestion } from '@/firebase/questions/main.ts'
import { createTest, updateTest } from '@/firebase/tests/main.ts'
import { useUser } from '../../../context/UserContext'
import { useForm } from 'react-hook-form'
import { Question } from '../Question'

const FormTest = ({ test = null }) => {

  const { register, handleSubmit, watch, setValue } = useForm(
    {
      defaultValues: {
        ...test
      }
    }
  )

  const onSubmit = (data) => {
    console.log(data)
    test?.id
      ?
      updateTest(test.id, { ...data, questions: questions }).then(res => console.log(res))
      :
      createTest({ ...data, questions: questions }).then(res => console.log(res))
  }
  const handleDeleteQuestion = (questionId) => {
    deleteQuestion(questionId)
  }
  const handleAddQuestionToTest = (questionId) => {
    const quests = watch('questions')
    quests?.includes(questionId) ?
      setValue('questions', quests.filter(question => question !== questionId)) :
      setValue('questions', [...quests, questionId])
  }
  return (
    <form className='grid gap-4 py-4'>
      <input placeholder='Titulo' {...register('title')} />
      {watch('questions')?.map(((question, i) =>
        <div>
          <div className='absolute -top-4 right-0 flex'>
            {alreadyInTest ?
              <button onClick={() => onClickAddQuestionTest(id)} className='btn btn-circle btn-xs btn-error'>
                <Icon name='cross' />
              </button>
              :
              <button onClick={() => onClickAddQuestionTest(id)} className='btn btn-circle btn-xs btn-success'>
                <Icon name='done' />
              </button>
            }

            <MainModal title='Editar pregunta' OpenComponent={Icon} OpenComponentProps={{ name: 'edit', className: 'btn-info btn-circle btn-xs' }}>
              <FormQuestion question={question} />
            </MainModal>
            <ModalDelete handleDelete={() => handleDeleteQuestion(id)}>
            </ModalDelete>
          </div>
          <Question
            key={`${question}-${i}`}
            alreadyInTest
            onClickAddQuestionTest={onClickAddQuestionTest}
            q={userQuestions.find(({ id }) => id === question)}
          />
        </div>
      ))}

      <AddQuestionToTest handleAddQuestionToTest={handleAddQuestionToTest} testQuestions={watch('questions')} />
      <button className='btn btn-primary' onClick={handleSubmit(onSubmit)}>
        Guardar Test
      </button>
    </form>
  )
}

const AddQuestionToTest = ({ handleAddQuestionToTest, testQuestions = [] }) => {
  const [userQuestions, setUserQuestions] = useState([])
  const { user } = useUser()
  useEffect(() => {
    listenUserQuestions(user.id, setUserQuestions)
  }, [])
  const onClickAddQuestionTest = (questionId) => {
    handleAddQuestionToTest(questionId)
  }
  console.log(userQuestions)
  return (
    <MainModal title='Todas las preguntas' buttonLabel='Ver preguntas' OpenComponentProps={{ className: 'btn btn-success' }}>
      <div className='grid gap-4'>
        {userQuestions?.map((q, i) =>
          <Question
            key={i}
            i={i}
            question={q}
            onClickAddQuestionTest={onClickAddQuestionTest}
            alreadyInTest={testQuestions?.find((question) => question === q.id)}
          />
        )}
      </div>
    </MainModal>
  )
}



export default FormTest
