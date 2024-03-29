import Icon from '@comps/Icon'
import MainModal from '@comps/Modal/MainModal'
import ModalDelete from '@comps/Modal/ModalDelete'
import { useEffect, useState } from 'react'
import FormQuestion from './FormQuestion'
import { listenUserQuestions, deleteQuestion } from '@/firebase/questions/main.ts'
import { createTest, updateTest } from '@/firebase/tests/main.ts'
import { useUser } from '../../../context/UserContext'
import { useForm } from 'react-hook-form'

const FormTest = ({ test = null }) => {
  const { user } = useUser()
  const [questions, setQuestions] = useState([])
  const handleAddQuestion = (newQuestion) => {
    setQuestions([...questions, newQuestion])
  }

  const [userQuestions, setUserQuestions] = useState([])

  useEffect(() => {
    listenUserQuestions(user.id, setUserQuestions)
  }, [user])

  const onClickAddQuestionTest = (questionId) => {
    testQuestions.includes(questionId) ?
      setTestQuestions(testQuestions.filter(question => question !== questionId))
      :
      setTestQuestions([...testQuestions, questionId])
  }

  const [testQuestions, setTestQuestions] = useState(test?.questions || [])

  return (
    <div className='grid'>
      <h1 className='text-2xl font-bold text-center my-5'>
        Nuevo Test
      </h1>

      <MainModal title='Todas las preguntas' buttonLabel='Ver preguntas' OpenComponentProps={{ className: 'btn btn-success' }}>
        <div className='grid gap-4'>
          <MainModal title='Nueva pregunta' buttonLabel='Nueva pregunta' OpenComponentProps={{ className: 'btn btn-primary' }}>
            <FormQuestion addQuestion={handleAddQuestion} />
          </MainModal>
          {userQuestions?.map((q, i) =>
            <Question
              key={i}
              q={q}
              i={i}
              onClickAddQuestionTest={onClickAddQuestionTest}
              alreadyInTest={testQuestions.find((question) => question === q.id)}
            />
          )}
        </div>
      </MainModal>
      <Form test={test}
        questions={testQuestions}
        userQuestions={userQuestions}
        onClickAddQuestionTest={onClickAddQuestionTest}
      />
    </div>
  )
}

const Form = ({ test, questions, userQuestions, onClickAddQuestionTest }) => {
  const { register, handleSubmit, watch } = useForm(
    {
      defaultValues: {
        questions,
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
  return (
    <form onSubmit={handleSubmit(onSubmit)} className='grid gap-4 py-4'>
      <input placeholder='Titulo' {...register('title')} />
      {questions?.map(((question, i) =>
        <Question
          key={`${question}-${i}`}
          alreadyInTest
          onClickAddQuestionTest={onClickAddQuestionTest}
          q={userQuestions.find(({ id }) => id === question)}
        />
      ))}
      <button className='btn btn-primary' onClick={handleSubmit(onSubmit)}>
        Guardar Test
      </button>
    </form>
  )
}


const Question = ({ q, i, onClickAddQuestionTest, alreadyInTest }) => {
  console.log(alreadyInTest)
  console.log(q)
  const { text = '', options = [], key = '', multiplier = 0, id = '' } = q
  const handleDeleteQuestion = (questionId) => {
    deleteQuestion(questionId)
  }
  return (
    <div
      key={i}
      className='relative border rounded-lg p-2 '
    >
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
          <FormQuestion question={q} />
        </MainModal>
        <ModalDelete handleDelete={() => handleDeleteQuestion(id)}>
        </ModalDelete>
      </div>
      <div className='text-2xl font-bold'>
        <p>
          {text}
        </p>
        <span className='font-thin '>
          {`( ${multiplier} )`}
        </span>
      </div>
      <div className='grid gap-2'>
        <h4>Opciones</h4>
        {options?.map((op, i) =>
          <div className=' border rounded-md flex' key={i}>

            <div className='px-1 mr-1 h-full bg-base-content rounded-l-md text-base-100'>
              {i + 1}
            </div>
            <p>
              {op?.text}
              <span className='font-thin'>{` ( ${op?.value} ) `}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  )

}

export default FormTest
