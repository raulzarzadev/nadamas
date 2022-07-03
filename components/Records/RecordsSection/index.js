import ButtonIcon from '@comps/Inputs/Button/ButtonIcon'
import MainModal from '@comps/Modal/MainModal'
import FormRecord from '@comps/Records/FormRecord'
import Section from '@comps/Section'
import { useState, useEffect } from 'react'

export default function RecordsSection({ userId, canCreateNewRecord }) {
  
  const [openNewRecord, setOpenNewRecord] = useState()
  const handleOpenNewRecord = () => {
    setOpenNewRecord(!openNewRecord)
  }

  const handleSaveRecord = (record) => {
    console.log(record)
  }

  return (
    <Section title="Registros">
      {canCreateNewRecord && (
        <>
          <MainModal title='Nuevo Record' OpenComponent={ButtonIcon} OpenComponentProps={{ iconName: 'plus', variant: 'circle' }}>
            <FormRecord  setRecord={handleSaveRecord} />
          </MainModal>
         
        </>
      )}
     
    </Section>
  )
}


