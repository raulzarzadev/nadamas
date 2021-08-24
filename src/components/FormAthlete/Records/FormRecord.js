import SWIMMING_TEST from '@/src/constants/SWIMMING_TEST'
import { formatInputDate } from '@/src/utils/Dates'
import { AddIcon, SaveIcon } from '@/src/utils/Icons'
import Button from '@comps/inputs/Button'
import PickerTime from '@comps/inputs/PickerTime'
import Text from '@comps/inputs/Text'
import Autocomplete from '@comps/inputs/TextAutocomplete'
import { useState } from 'react'
import PickerRecord from './PickerRecord'
export default function FormRecord({ handleAddRecord }) {
  const initialState = {
    date: new Date(),
    place: 'CREA',
    test: '',
    time: '00:00.000'
  }
  const items = SWIMMING_TEST
  const [form, setFrom] = useState(initialState)
  const handleChange = ({ target: { value, name } }) => {
    setFrom({ ...form, [name]: value })
  }
  const handleChangeRecord = (time) => {
    setFrom({ ...form, time })
  }

  const handleSetTest=(test)=>{
    setFrom({...form, test})
  }

  return (
    <div className=" block items-end sm:flex sm:flex-wrap text-sm">
      <div className="p-1  w-full sm:w-1/2  ">
        <Text
          onChange={handleChange}
          name="date"
          type="date"
          value={formatInputDate(form.date)}
          label="Fecha"
        />
      </div>
      <div className="p-1  w-full sm:w-1/2 ">
        <Text
          onChange={handleChange}
          name="place"
          value={form?.place}
          label="Instalaciones"
        />
      </div>

      <div className="p-1  w-full sm:w-1/2  ">
        <Autocomplete
          label="Prueba"
          placeholder="Prueba"
          items={items}
          value={form?.test}
          onSelect={(value) => handleSetTest(value)}
          onChange={({ target: { value } }) => handleSetTest(value)}
        />
        {/*        
          <Text
            onChange={handleChange}
            name="test"
            value={form?.test}
            label="Prueba"
          />
        */}
      </div>
      <div className="p-1  w-full sm:w-1/2 ">
        <PickerRecord handleChange={handleChangeRecord} />
      </div>
      <div className="p-1  w-full sm:w-1/2  mx-auto ">
        <Button
          fullWidth
          variant="primary"
          p="sm"
          onClick={(e) => {
            e.preventDefault()
            handleAddRecord(form)
            setFrom(initialState)
          }}
        >
          Guardar <SaveIcon />
        </Button>
      </div>
    </div>
  )
}
