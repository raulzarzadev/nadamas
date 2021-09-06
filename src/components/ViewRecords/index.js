import { getAthletes } from '@/firebase/athletes'
import { getRecords } from '@/firebase/records'
import { useAuth } from '@/src/context/AuthContext'
import { AddIcon } from '@/src/utils/Icons'
import DisplayRecords from '@comps/FormAthlete/Records/DisplayRecords'
import FormRecord from '@comps/FormAthlete/Records/FormRecord'
import Button from '@comps/inputs/Button'
import Modal from '@comps/Modals/Modal'
import { useEffect, useState } from 'react'

export default function ViewRecords() {
  const [records, setRecords] = useState()
  const { user } = useAuth()
  const [athletes, setAthletes] = useState([])

  const [openNewRecord, setOpenNewRecord] = useState(false)
  const handleOpenNewRecord = () => {
    setOpenNewRecord(!openNewRecord)
  }
  const handleAddRecord = (record) => {
    console.log(record)
  }

  useEffect(() => {
    getRecords()
      .then((res) => {
        const formatRecordsWithAthletes = res.map((record) => {
          const athlete = athletes.find(({ id }) => record.athleteId === id)
          return { ...record, athlete }
        })
        setRecords(formatRecordsWithAthletes)
      })
      .catch((err) => console.log('err', err))
  }, [athletes])

  useEffect(() => {
    if (user) {
      getAthletes(user.id)
        .then((res) => {
          const formatAutocompleteAthlete = res.map((athlete) => {
            const label = `${athlete?.name} ${athlete?.lastName}`
            return { ...athlete, label }
          })
          setAthletes(formatAutocompleteAthlete)
        })
        .catch((err) => console.log('err', err))
    }
  }, [user])
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
            showAthlete
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
          athletes={athletes}
          handleAddRecord={(record) => {
            handleAddRecord(record)
            handleOpenNewRecord()
          }}
        />
      </Modal>
    </div>
  )
}
