import { useUser } from '@/context/UserContext'
import { getOldAthlete } from '@/firebase/athletes'
import { deleteResult, getAthleteResults, listenAthleteResults, newAtheleteResult, updateResutl } from '@/firebase/results'
import { getUser } from '@/firebase/users'
import { dateFormat } from '@/utils/dates'
import Icon from '@comps/Icon'
import ButtonIcon from '@comps/Inputs/Button/ButtonIcon'
import Modal from '@comps/Modal'
import MainModal from '@comps/Modal/MainModal'
import ModalDelete from '@comps/Modal/ModalDelete'
import FormRecord from '@comps/Records/FormRecord'
import Section from '@comps/Section'
import { useState, useEffect } from 'react'

export default function RecordsSection({ userId, canCreateNewRecord }) {
  // TODO get athletes information fron athletesId and userId. for legasy info

  //********************************************************* */
  // *** this options are for legasy info ***
  //********************************************************* */
  const [oldResults, setOldResults] = useState([])
  useEffect(() => {
    if (userId)
      getOldAthlete(userId).then((res) => {
        if (res) {
          getAthleteResults(res.id).then((res) => setOldResults([...res]))
        }
      })
  }, [])

  //********************************************************* */
  // *** this options are for legasy info ***
  //********************************************************* */

  const { user } = useUser()
  const [userAthlete, setUserAthlete] = useState(undefined)
  const [results, setResults] = useState([])

  useEffect(() => {
    if (userId) {
      listenAthleteResults(userId, res => {
        setResults([...res])
      })
      getUser(userId).then(setUserAthlete)
    }
  }, [userId])


  const [openNewRecord, setOpenNewRecord] = useState()
  const handleOpenNewRecord = () => {
    setOpenNewRecord(!openNewRecord)
  }

  const handleSaveRecord = (record) => {
    const athlete = {
      id: userAthlete?.id || null,
      name: userAthlete?.name || null,
      alias: userAthlete?.alias || null,
      birth: userAthlete?.birth || null
    }
    newAtheleteResult(athlete, record, { userId: user.id })
      .then((res) => console.log(`res`, res))
      .catch((err) => console.log(`err`, err))
  }


  // const canCreateNewRecord = true

  return (
    <Section title="Registros">
      {canCreateNewRecord && (
        <>
          <MainModal OpenComponent={ButtonIcon} OpenComponentProps={{ iconName: 'plus', variant: 'circle' }}>
            <FormRecord setRecord={handleSaveRecord} />
          </MainModal>
         
        </>
      )}
      <ResultsRows results={[...results, ...oldResults]} />
    </Section>
  )
}

const ResultsRows = ({ results }) => {
  results.sort((a, b) => {
    if (a?.date > b?.date) return -1
    if (a?.date < b?.date) return 1
    return 0
  })
  return <div>
    {results.map((record) => (
      <RecordRow key={record.id} record={record} />
    ))
    }
  </div>
}



const RecordRow = ({ record }) => {
  const { test, date, id, event, ...rest } = record
  const [openDetails, setOpenDetails] = useState()
  const handleOpenDetails = () => {
    setOpenDetails(!openDetails)
  }

  const handleEditRecord = (record) => {
    updateResutl(record).then((res) => console.log('updated', res)).catch(err => console.log('err', err)).finally(() => console.log('finaliza'))
  }
  console.log(new Date())

  return (
    <div key={id} className="flex justify-between text-sm">
      <div className="p-0.5 justify-end flex   w-[30%]">
        {date ? dateFormat(date, 'dd MMM yy HH:mm') : '-'}
      </div>
      <div className="p-0.5 justify-end flex w-[15%] ">{test.distance}</div>
      <div className="p-0.5 flex justify-center w-[25%] ">{test.style}</div>
      <div className="p-0.5 justify-between w-[30%] hidden sm:flex truncate">
        {test.record}

      </div>
      {/*   <div className='p-0.5 justify-between w-[10%] flex'>
        <span>
          <button
            onClick={() => {
              handleOpenDetails()
            }}
          >
            <Icon name="dots" />
          </button>
        </span>
      </div> */}
      {/* 
      
      // *** *** *** *** *** *** *** *** *** *** *** *** *** ***
      //                                             Modal Registro
      // *** *** *** *** *** *** *** *** *** *** *** *** *** ***
       */}
      <MainModal OpenComponent={Icon} OpenComponentProps={{ name: 'dots' }}>
        <div>{date ? dateFormat(date, 'dd MMM yy') : '-'}</div>
        <div> {event && <div>Evento:{event.name || event.title}</div>}</div>
        <div>
          {test && (
            <div>
              <p> Prueba:</p>
              <p> {`${test.distance} x ${test.style} `}</p>
              <p><span className='text-2xl font-bold'>{test.record}</span></p>
            </div>
          )}
        </div>
        {/* 
        
        // *** *** *** *** *** *** *** *** *** *** *** *** *** ***
        //                                            Sub Modal Delete Registro
        // *** *** *** *** *** *** *** *** *** *** *** *** *** ***
         */}
        <Section title={'Opciones'}>
          <div className='grid gap-2 place-content-center place-items-center'>

            <MainModal title='Editar registro' buttonLabel='Editar  '>
              <FormRecord record={record} setRecord={handleEditRecord} />
            </MainModal>

            <ModalDelete
              buttonLabel="Eliminar registro"
              buttonVariant="btn"
              handleDelete={() => {
                deleteResult(id)
                  .then((res) => console.log(res))
                  .catch((err) => console.log(err))
              }}
            />
          </div>

        </Section>
      </MainModal>
      {/* <Modal
        title="Detalles de resultado "
        open={openDetails}
        handleOpen={handleOpenDetails}
      >
     
      </Modal> */}
    </div>
  )
}
