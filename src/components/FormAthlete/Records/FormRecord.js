import { formatInputDate } from '@/src/utils/Dates'
import { AddIcon } from '@/src/utils/Icons'
import Button from '@comps/inputs/Button'
import PickerTime from '@comps/inputs/PickerTime'
import Text from '@comps/inputs/Text'
import { useState } from 'react'
import PickerRecord from './PickerRecord'

export default function FormRecord({ handleAddRecord }) {
  const initialState = {
    date: new Date(),
    place: '',
    test: '',
    time: '00:00.000'
  }
  const [form, setFrom] = useState(initialState)
  const handleChange = ({ target: { value, name } }) => {
    setFrom({ ...form, [name]: value })
  }
  const handleChangeRecord = (time) => {
    setFrom({ ...form, time })
  }

  return (
    <div className="">
      <div className=" flex  flex-wrap items-end">
        <div className="my-2 w-1/2 p-2 ">
          <Text
            onChange={handleChange}
            name="date"
            type="date"
            value={formatInputDate(form.date)}
            label="Fecha"
          />
        </div>
        <div className="my-2 w-1/2 p-2">
          <Text
            onChange={handleChange}
            name="place"
            value={form?.place}
            label="Instalaciones"
          />
        </div>
        <div className="my-2 w-1/2 p-2">
          <Text
            onChange={handleChange}
            name="test"
            value={form?.test}
            label="Prueba"
          />
        </div>
        <div className="my-2 w-1/2 p-2">
          <PickerRecord handleChange={handleChangeRecord} />
        </div>
        <div className="my-2 w-1/2 p-2 mx-auto">
          <Button
            fullWidth
            variant="secondary"
            p="sm"
            onClick={(e) => {
              e.preventDefault()
              handleAddRecord(form)
              setFrom(initialState)
            }}
          >
            Guardar registro <AddIcon />
          </Button>
        </div>
      </div>
    </div>
  )
}
