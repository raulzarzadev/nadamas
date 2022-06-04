import { useEffect, useState } from "react"
import { listenAllTests, deleteTest } from '@/firebase/tests/main'
import MainModal from "../../Modal/MainModal"
import ModalDelete from '@comps/Modal/ModalDelete'
import FormTest from "../test/FormTest"
import Icon from '@comps/Icon'

const Tests = () => {

  const [tests, setTests] = useState([])

  useEffect(() => {
    listenAllTests(setTests)
  }, [])

  return (
    <div>
      {tests.map((test) => {
        console.log(test)
        return (
          <div key={test.id} className='relative'>
            <div>
              <MainModal OpenComponent={Icon} OpenComponentProps={{ name: 'edit', className: 'btn btn-circle btn-xs btn-info' }}>
                {/* <FormTest test={test} /> */}
              </MainModal>
              <ModalDelete handleDelete={() => deleteTest(test.id)}>
              </ModalDelete>
            </div>
            <h2 className="text-xl font-bold">{test.title || 'titulo'}</h2>
            {test.title}

            {/*   Preguntas
            {test?.questions?.map((question) =>
              <div key={question.id}>
                {question.text}
              </div>
            )} */}
          </div>
        )
      })}
    </div>
  )
}



export default Tests
