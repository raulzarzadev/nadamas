import { useUser } from '@/context/UserContext'
import { getOldAthlete } from '@/firebase/athletes'
import { getAthleteResults, newAtheleteResult } from '@/firebase/results'
import { getUser } from '@/firebase/users'
import { dateFormat } from '@/utils/dates'
import ButtonIcon from '@comps/Inputs/Button/ButtonIcon'
import Modal from '@comps/Modal'
import FormRecord from '@comps/Records/FormRecord'
import Section from '@comps/Section'
import { useState, useEffect } from 'react'

export default function AthleteSection({ userId, canCreateNewRecord }) {
  // TODO get athletes information fron athletesId and userId. for legasy info

  //********************************************************* */
  // *** this options are for legasy info ***
  //********************************************************* */
  const [oldAthlete, setOldAthlete] = useState(undefined)
  const [oldResults, setOldResults] = useState([])
  useEffect(() => {
    if (userId)
      getOldAthlete(userId).then((res) => {
        if (res) {
          getAthleteResults(res.id).then((res) => setOldResults([...res]))
        }
      })
  }, [])

  console.log(oldAthlete)
  console.log('old results', oldResults)
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

  // console.log(userAthlete)

  const [openNewRecord, setOpenNewRecord] = useState()
  const handleOpenNewRecord = () => {
    setOpenNewRecord(!openNewRecord)
  }

  console.log('results', results)

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
        {[...results, ...oldResults].map(({ id, test, date }) => (
          <div key={id} className="flex justify-between text-sm">
            <div className="p-0.5 justify-end flex   w-[30%]">
              {date ? dateFormat(date, 'dd MMM yy') : '-'}
            </div>
            <div className="p-0.5 justify-end flex w-[15%] ">
              {test.distance}
            </div>
            <div className="p-0.5 flex justify-center w-[25%] ">
              {test.style}
            </div>
            <div className="p-0.5 flex justify-start w-[30%] ">
              {test.record}
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}
