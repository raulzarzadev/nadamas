import { createRecord, getRecords } from '@/firebase/records'
import { useEffect, useState } from 'react'
import DisplayRecords from './DisplayRecords'
import FormRecord from './FormRecord'

export default function Records({ athlete: { id } }) {
  useEffect(() => {
    if (id) {
      getAndSetRecords()
    }
  }, [id])

  function getAndSetRecords() {
    getRecords(id)
      .then(setRecords)
      .catch((err) => console.log('err', err))
  }

  const [records, setRecords] = useState([])

  const handleAddRecord = async (newRecord) => {
    await createRecord({ athleteId: id, ...newRecord })
      .then((res) => console.log('res', res))
      .catch((err) => console.log('err', err))
    getAndSetRecords()
  }

  /*   const handleRemoveRecord = (recordId) => {
    removeRecord(recordId)
    getRecords(form.id).then(setRecords)
  } */
  return (
    <div className="">
      <div>
        <FormRecord handleAddRecord={handleAddRecord} />
        <DisplayRecords records={records} />
      </div>
    </div>
  )
}
