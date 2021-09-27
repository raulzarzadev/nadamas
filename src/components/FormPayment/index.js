import { formatInputDate } from '@/src/utils/Dates'
import AthleteSimpleRow from '@comps/AthleteRow/AthleteSimpleRow'
import SearchAthletes from '@comps/inputs/SearchAthletes'
import Text from '@comps/inputs/Text'
import { useRouter } from 'next/router'
import { useState } from 'react'

export default function FormPayment() {
  const [form, setForm] = useState({})
  const {
    query: { id }
  } = useRouter()
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSetAthlete = (athlete) => {
    
    setForm({ ...form, athleteId: athlete?.id, athlete })
  }

  console.log(form)
  return (
    <div className="">
      <SearchAthletes
        athleteSelected={id}
        AthleteRowResponse={AthleteSimpleRow}
        setAthlete={handleSetAthlete}
      />
      <Text
        onChange={handleChange}
        name="date"
        type="date"
        value={formatInputDate(form.date)}
        label="Fecha"
      />
      <Text
        label="Cantidad"
        name="quantity"
        onChange={handleChange}
        value={form.quantity || '0'}
      />
      {/*  <input type="file" /> */}
    </div>
  )
}
