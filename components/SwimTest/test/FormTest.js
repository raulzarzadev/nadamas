import Icon from '@comps/Icon'
import MainModal from '@comps/Modal/MainModal'
import ModalDelete from '@comps/Modal/ModalDelete'
import { useState } from 'react'
import FormQuestion from './FormQuestion'

const FormTest = () => {
  const [questions, setQuestions] = useState([])
  const handleAddQuestion = (newQuestion) => {
    setQuestions([...questions, newQuestion])
  }
  console.log(questions)
  const handleDeleteQuestion = () => {
    console.log('delete ')
  }
  const handleEditQuestion = (index) => {
    console.log('edit', index)
  }
  return (
    <div className='grid'>
      <h1 className='text-2xl font-bold text-center my-5'>
        Nuevo Test
      </h1>
      {questions?.map(({ text, options }, i) =>
        <div
          key={i}
          className='relative border rounded-lg p-2 '
        >
          <div className='absolute -top-4 right-0 flex'>
            <button className='btn btn-circle btn-xs btn-info' onClick={() => handleEditQuestion(i)}>
              <Icon name='edit' />
            </button>
            <ModalDelete handleDelete={() => handleDeleteQuestion(i)}>
            </ModalDelete>

          </div>
          <div className='text-2xl font-bold'>
            <span>
              {text}
            </span>
          </div>
          <div className='grid gap-2'>
            <h4>Opciones</h4>
            {options?.map((op, i) =>
              <div className=' border rounded-md flex'>

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
      )}

      <MainModal buttonLabel='Nueva pregunta' OpenComponentProps={{ className: 'btn btn-primary' }}>
        <FormQuestion addQuestion={handleAddQuestion} />
      </MainModal>
    </div>
  )
}

export default FormTest
