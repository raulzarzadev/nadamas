import { dateFormat } from '@/utils/dates'
import Icon from '@comps/Icon'
import Button from '@comps/Inputs/Button'
import PickerRecord from '@comps/Inputs/PickerRecord'
import PickerTest from '@comps/Inputs/PickerTest'
import TextInput from '@comps/Inputs/TextInput'
import ModalDelete from '@comps/Modal/ModalDelete'
import { format } from 'date-fns'
import { useEffect, useState } from 'react'

export default function FormRecord({ record, setRecord = () => { } }) {
  // const initialDate = record?.date ? dateFormat(record?.date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  const initalFormState = { date: record?.date }

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
    setRecord({ ...form, test: { ...form.test, record: form.record } })
    setAlreadySent(true)
    setForm(initalFormState)
  }



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
      </div>
      <PickerTest setTest={handleSetFormValue} test={form?.test} />
      <div className="flex flex-col text-center w-full justify-evenly py-2 px-1 items-center">
        <div className="my-2">
          Tiempo
          <PickerRecord setValue={handleSetFormValue} value={form?.record} />
        </div>
        <div className="grid gap-2 place-items-center sm:flex">
          <Button
            disabled={alreadySent}
            variant="primary"
            onClick={(e) => {
              e.preventDefault()
              handleSaveRecord()
            }}
          >
            {alreadySent ? 'Guardado' : 'Guardar'}
            <Icon name="save" />
          </Button>
        </div>
        <ModalDelete
          title="Eliminar"
          text="¿Eliminar esta marca?"
          handleDelete={() => handleDeleteRecord(form?.id)}
        />
      </div>
    </div>
  )
}
