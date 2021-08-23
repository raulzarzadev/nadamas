import { createRecord, getRecords } from '@/firebase/records'
import Info from '@comps/Alerts/Info'
import Button from '@comps/inputs/Button'
import Modal from '@comps/Modals/Modal'
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

  const [openNewRecord, setOpenNewRecord] = useState(false)
  const handleOpenNewRecord = () => {
    setOpenNewRecord(!openNewRecord)
  }

  return (
    <div className="">
      <div>
        {/* <FormRecord handleAddRecord={handleAddRecord} /> */}
        <div className="w-12 mx-auto">
          <Button onClick={handleOpenNewRecord} variant="secondary" size="sm">
            Nuevo
          </Button>
        </div>
        {records?.length === 0 ? (
          <div>
            <Info text="Aun no hay registros" fullWidth />
          </div>
        ) : (
          <DisplayRecords records={records} />
        )}
      </div>
      <Modal
        open={openNewRecord}
        handleOpen={handleOpenNewRecord}
        title="Nuevo Registro"
      >
        <FormRecord
          handleAddRecord={(record) => {
            handleAddRecord(record)
            handleOpenNewRecord()
          }}
        />
      </Modal>
    </div>
  )
}
