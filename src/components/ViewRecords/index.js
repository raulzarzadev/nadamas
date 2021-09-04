import { AddIcon } from '@/src/utils/Icons'
import DisplayRecords from '@comps/FormAthlete/Records/DisplayRecords'
import FormRecord from '@comps/FormAthlete/Records/FormRecord'
import Button from '@comps/inputs/Button'
import Modal from '@comps/Modals/Modal'
import { useState } from 'react'

export default function ViewRecords() {
  const [records, setRecords] = useState()
  const [openNewRecord, setOpenNewRecord] = useState(false)
  const handleOpenNewRecord = () => {
    setOpenNewRecord(!openNewRecord)
  }
  return (
    <div className=" p-4">
      <div>
        {/* <FormRecord handleAddRecord={handleAddRecord} /> */}
        <div className="w-12 mx-auto">
          <Button onClick={handleOpenNewRecord} variant="secondary" size="sm">
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
