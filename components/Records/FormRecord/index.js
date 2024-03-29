import { dateFormat } from '@/utils/dates'
import Icon from '@comps/Icon'
import Button from '@comps/Inputs/Button'
import PickerRecord from '@comps/Inputs/PickerRecord'
import PickerTest from '@comps/Inputs/PickerTest'
import TextInput from '@comps/Inputs/TextInput'
import ModalDelete from '@comps/Modal/ModalDelete'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import ButtonSave from '../../Inputs/Button/ButtonSave'
//import SearchAthletes from './SearchAthletes'

export default function FormRecord({ record, setRecord = () => { }, searchAthletes = false }) {
  const router = useRouter()

  // console.log(router)

  // const initialDate = record?.date ? dateFormat(record?.date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  const athleteId = router?.query?.memberId || null

  const initalFormState = {
    date: record?.date || dateFormat(new Date(), 'yyyy-MM-dd'),
    athleteId,
    record: 0
  }

  const [form, setForm] = useState(initalFormState)

  const [alreadySent, setAlreadySent] = useState(false)

  useEffect(() => {
    record && setForm(record)
  }, [record])


  const handleChange = ({ target }) => {
    setAlreadySent(false)
    setForm({ ...form, [target.name]: target.value })
  }

  const handleSetFormValue = (fieldName, fieldValue) => {
    setAlreadySent(false)
    setForm({ ...form, [fieldName]: fieldValue })
  }

  const handleDeleteRecord = (id) => {
    if (!id) return setForm(initalFormState)
    console.log('remove record', id)
  }

  const handleSaveRecord = () => {
    setRecord({
      ...form,
      race:
        { ...form?.race, record: form?.record, date: form?.date },
      athlete: {
        id: athleteId
      }
    })
    setAlreadySent(true)
    setForm(initalFormState)
  }

  const validForm = !!form?.record && !!form?.race?.style && !!form?.race?.distance
  
 

  return (
    <div className="max-w-sm mx-auto pt-3 p-1">


      <div className="my-2 flex justify-center">
        <TextInput
          onChange={handleChange}
          name="date"
          type="date"
          value={dateFormat(form?.date, 'yyyy-MM-dd')}
          label="Fecha"
        />

        {/**  TODO * Add  user input// if user is selected, omit it. */}

      </div>
      <PickerTest setTest={handleSetFormValue} test={form?.race} fieldName='race'/>
      <div className="flex flex-col text-center w-full justify-evenly py-2 px-1 items-center">
        <div className="my-2">
          Tiempo
          <PickerRecord setValue={handleSetFormValue} value={form?.record} inMilliseconds />
        </div>
        <div className="grid gap-2 place-items-center sm:flex">

          <ButtonSave
            saved={alreadySent}
            disabled={!validForm}
            onClick={(e) => {
              e.preventDefault()
              handleSaveRecord()
            }}
          />

        </div>
        <ModalDelete
          title="Eliminar"
          text="¿Eliminar esta marca?"
          handleDelete={() => handleDeleteRecord(form?.id)}
        />
      </div>
    </div >
  )
}
