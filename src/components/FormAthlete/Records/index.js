import { createOrUpdateRecord, getAthleteRecords } from '@/firebase/records'
import { AddIcon } from '@/src/utils/Icons'
import Info from '@comps/Alerts/Info'
import Button from '@comps/inputs/Button'
import Modal from '@comps/Modals/Modal'
import router from 'next/router'
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
    getAthleteRecords(id)
      .then(setRecords)
      .catch((err) => console.log('err', err))
  }

  const [records, setRecords] = useState([])
  console.log('records', records)
  

  const handleAddRecord = async (newRecord) => {
    await createOrUpdateRecord({ athleteId: id, ...newRecord })
      .then((res) => console.log('res', res))
      .catch((err) => console.log('err', err))
    getAndSetRecords()
  }

  /*   const handleRemoveRecord = (recordId) => {
    removeRecord(recordId)
    getAthleteRecords(form.id).then(setRecords)
  } */

  const [openNewRecord, setOpenNewRecord] = useState(false)
  const handleNewRecord = () => {
    router.push(`/records/new?search=${id}`)
  }

  return (
    <div className="">
      <div>
        {/* <FormRecord handleAddRecord={handleAddRecord} /> */}
        <div className="w-12 mx-auto">
          <Button onClick={handleNewRecord} variant="secondary" size="sm">
            Nuevo <AddIcon />
          </Button>
        </div>
        {records?.length === 0 ? (
          <div>
            <Info text="Aun no hay registros" fullWidth />
          </div>
        ) : (
          <DisplayRecords
            records={records}
            updateRecords={() => {
              getAndSetRecords()
            }}
          />
        )} 
      </div>
      {/* <Modal
        open={openNewRecord}
        handleOpen={handleOpenNewRecord}
        title="Nuevo Registro"
      >
        <FormRecord
        details
          handleAddRecord={(record) => {
            handleAddRecord(record)
            handleOpenNewRecord()
          }}
        />
      </Modal> */}
    </div>
  )
}
