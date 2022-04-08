import { useUser } from '@/context/UserContext'
import { getOldAthlete } from '@/firebase/athletes'
import { deleteResult, getAthleteResults, newAtheleteResult } from '@/firebase/results'
import { getUser } from '@/firebase/users'
import { dateFormat } from '@/utils/dates'
import Icon from '@comps/Icon'
import ButtonIcon from '@comps/Inputs/Button/ButtonIcon'
import Modal from '@comps/Modal'
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
  useEffect(() => {
    if (userId) getUser(userId).then(setUserAthlete)
  }, [])

  const [results, setResults] = useState([])

  useEffect(() => {
    if (userAthlete) {
      getAthleteResults(userAthlete.id).then((res) => setResults([...res]))
    }
  }, [userAthlete])

  const [openNewRecord, setOpenNewRecord] = useState()
  const handleOpenNewRecord = () => {
    setOpenNewRecord(!openNewRecord)
  }

  const handleSaveRecord = (record) => {
    const athlete = {
      id: userAthlete?.id,
      name: userAthlete?.name,
      alias: userAthlete?.alias,
      birth: userAthlete?.birth
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
          <ButtonIcon
            iconName="plus"
            variant="circle"
            onClick={handleOpenNewRecord}
          />
          <Modal
            open={openNewRecord}
            handleOpen={handleOpenNewRecord}
            title="Nuevo registro"
          >
            <FormRecord setRecord={handleSaveRecord} />
          </Modal>
        </>
      )}
      <div>
        {[...oldResults, ...results].map((record) => (
          <RecordRow key={record.id} record={record} />
        ))}
      </div>
    </Section>
  )
}

const RecordRow = ({ record: { test, date, id, event, ...rest } }) => {
  const [openDetails, setOpenDetails] = useState()
  const handleOpenDetails = () => {
    setOpenDetails(!openDetails)
  }
  // console.log(rest)

  return (
    <div key={id} className="flex justify-between text-sm">
      <div className="p-0.5 justify-end flex   w-[30%]">
        {date ? dateFormat(date, 'dd MMM yy') : '-'}
      </div>
      <div className="p-0.5 justify-end flex w-[15%] ">{test.distance}</div>
      <div className="p-0.5 flex justify-center w-[25%] ">{test.style}</div>
      <div className="p-0.5 flex justify-between w-[30%] ">
        {test.record}
        <span>
          <button
            onClick={() => {
              handleOpenDetails()
            }}
          >
            <Icon name="dots" />
          </button>
        </span>
      </div>
      <Modal
        title="Resultado"
        open={openDetails}
        handleOpen={handleOpenDetails}
      >
        <div>Fecha:{date ? dateFormat(date, 'dd MMM yy') : '-'}</div>
        <div>Evento: {event && <div>{event.name || event.title}</div>}</div>
        <div>
          Prueba:{' '}
          {test && (
            <div>
              <p>{`${test.distance} x ${test.style} @${test.record}`}</p>
            </div>
          )}
        </div>
        <div>Premios</div>
        <Section title={'Opciones'}>
          <ModalDelete
            buttonLabel="Eliminar registro"
            buttonVariant="btn"
            handleDelete={() => {
              deleteResult(id)
                .then((res) => console.log(res))
                .catch((err) => console.log(err))
            }}
          />
        </Section>
      </Modal>
    </div>
  )
}
