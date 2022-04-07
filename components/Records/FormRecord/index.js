/* import { useAuth } from '@/legasy/src/context/AuthContext'
import DeleteModal from '@/legasy/src/components/Modals/DeleteModal' */
import { useUser } from '@/context/UserContext'
import { dateFormat } from '@/utils/dates'
import Icon from '@comps/Icon'
import Button from '@comps/Inputs/Button'
import PickerRecord from '@comps/Inputs/PickerRecord'
import PickerTest from '@comps/Inputs/PickerTest'
import TextInput from '@comps/Inputs/TextInput'
import ModalDelete from '@comps/Modal/ModalDelete'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
/* import {
  addEventResult,
  deleteResult,
  deleteUserResult
} from '@/legasy/firebase/results'
import PickerTest from '@/legasy/src/components/inputs/PickerTest' */

export default function FormRecord({ record, setRecord = () => {} }) {
  const initalFormState = { date: dateFormat(new Date(), 'yyyy-MM-dd') }
  const [form, setForm] = useState(initalFormState)

  useEffect(() => {
    record && setForm(record)
  }, [record])


  const handleChange = ({ target }) => {
    setForm({ ...form, [target.name]: target.value })
  }

  const handleSetFormValue = (fieldName, fieldValue) => {
    setForm({ ...form, [fieldName]: fieldValue })
  }

  const handleDeleteRecord = (id) => {
    if (!id) return setForm(initalFormState)
    console.log('remove record', id)
  }

  const handleSaveRecord = () => {
    setRecord({ ...form, test: { ...form.test, record: form.record } })
  }


  return (
    <div className="max-w-sm mx-auto pt-3 p-1">
      <div className="my-2 flex justify-center">
        <TextInput
          onChange={handleChange}
          name="date"
          type="date"
          value={dateFormat(form?.date || new Date())}
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
            // fullWidth
            // disabled={!isValid}
            variant="primary"
            // loading={saving}
            onClick={(e) => {
              e.preventDefault()
              handleSaveRecord()
            }}
          >
            Guardar
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
