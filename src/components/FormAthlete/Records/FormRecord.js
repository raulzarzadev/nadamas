import SWIMMING_TESTS from '@/src/constants/SWIMMING_TESTS'
import { formatInputDate } from '@/src/utils/Dates'
import { AddIcon, SaveIcon } from '@/src/utils/Icons'
import Button from '@comps/inputs/Button'
import PickerTime from '@comps/inputs/PickerTime'
import Text from '@comps/inputs/Text'
import Autocomplete from '@comps/inputs/TextAutocomplete'
import { useEffect, useState } from 'react'
import PickerRecord from './PickerRecord'

export default function FormRecord({ handleAddRecord, selectAthlete }) {
  const initialState = {
    date: new Date(),
    place: 'CREA',
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

  const handleSetTest = (test) => {
    setFrom({ ...form, test })
  }
  const handleSetAthlete = (athlete) => {
    setFrom({...form, athlete})
  }

 useEffect(()=>{
   console.log('searchaby', form.athlete)
   
 },[form.athlete])

  return (
    <div className=" block items-end sm:flex sm:flex-wrap text-sm">
      <div className="w-full flex justify-center">
        <Autocomplete
          value={form.athlete}
          name="athlete"
          label="Buscar athleta"
          placeholder="Buscar athleta"
          items={[{ id: '1', label: 'atleta 1' }]}
          onSelect={(value) => handleSetAthlete(value)}
          onChange={({ target: { value } }) => handleSetAthlete(value)}
        />
      </div>
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
          items={SWIMMING_TESTS}
          value={form?.test}
          onSelect={(value) => handleSetTest(value)}
          onChange={({ target: { value } }) => handleSetTest(value)}
        />
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
