import ButtonIcon from '@comps/Inputs/Button/ButtonIcon'
import MainModal from '@comps/Modal/MainModal'
import FormRecord from '@comps/Records/FormRecord'
import Section from '@comps/Section'
import { useState, useEffect } from 'react'
import RecordsTable from './RecordsTable'
import { RecordCRUD } from '@firebase/records/main'

export default function RecordsSection({ athleteId, canCreateNewRecord, userRecords }) {

  const handleSaveRecord = (record) => {
    console.log(record)
    RecordCRUD.create(record).then(res => console.log(res))
  }



  const [records, setRecords] = useState()

  useEffect(() => {
    RecordCRUD.listenAthleteRecords(athleteId, setRecords)
    // get athelte records
  }, [])

  return (
    <Section title="Registros">
      {canCreateNewRecord && (
        <>
          <MainModal title='Nuevo Record' OpenComponent={ButtonIcon} OpenComponentProps={{ iconName: 'plus', variant: 'circle' }}>
            <FormRecord setRecord={handleSaveRecord}  />
          </MainModal>
        </>
      )}

      <RecordsTable records={records} />

    </Section>
  )
}


