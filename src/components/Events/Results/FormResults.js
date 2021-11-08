import { addEventResult, getEvent } from '@/firebase/events'
import useAthlete from '@/src/hooks/useAthlete'
import { AddIcon } from '@/src/utils/Icons'
import PickerRecord from '@comps/Athlete/Records/PickerRecord'
import PickerTest from '@comps/Athlete/Records/PickerTests'
import Button from '@comps/inputs/Button'
import Loading from '@comps/Loading'
import Modal from '@comps/Modals/Modal'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function FormResults() {
  const [participants, setParticipants] = useState([])
  const [event, setEvent] = useState(undefined)
  const router = useRouter()
  const {
    query: { id: eventId }
  } = router
  useEffect(() => {
    if (eventId)
      getEvent(eventId)
        .then((res) => {
          setEvent(res)
          setParticipants(res.participants)
        })
        .catch((err) => console.log(`err`, err))
  }, [eventId])
  const [openParticipants, setOpenParticipants] = useState()
  const handleOpenParticipants = () => {
    setOpenParticipants(!openParticipants)
  }
  const handleAddCompetitor = (athlete) => {
    setCompetitors([...competitors, athlete])
  }
  const [competitors, setCompetitors] = useState([])

  const [test, setTest] = useState()
  console.log(`test`, test)
  if (event === undefined) return <Loading />
  return (
    <div className="max-w-md mx-auto">
      <h3 className="text-center text-2xl">Nuevo resultado</h3>
      <div className="">
        <PickerTest setTest={(test) => setTest(test)} />
      </div>
      <h4 className="text-center text-xl">Competidores </h4>
      <div>
        <Button onClick={handleOpenParticipants}>
          Agregar
          <AddIcon />
        </Button>
      </div>

      {competitors.map((athlete) => (
        <CompetitorRow
          athlete={athlete}
          key={athlete.id}
          event={event}
          test={test}
        />
      ))}
      <div>
        <Modal
          open={openParticipants}
          handleOpen={handleOpenParticipants}
          title="Agregar competidores"
        >
          {participants.map((participant) => (
            <Participant
              athleteId={participant}
              key={participant}
              handleAddCompetitor={handleAddCompetitor}
            />
          ))}
        </Modal>
      </div>
    </div>
  )
}

const CompetitorRow = ({ athlete, test, event }) => {
  const [saved, setSaved] = useState(false)
  const handleSaveResult = () => {
    const resultData = {
      eventData: { id: event.id, title: event.title },
      athleteData: { id: athlete.id, name: athlete.name },
      test: { ...test, record: form }
    }
    addEventResult(resultData)
      .then((res) => console.log(`res`, res))
      .catch((err) => console.log(`err`, err))
    setSaved(true)
  }
  const [form, setForm] = useState({})
  return (
    <div className="flex items-center justify-center">
      <div>{athlete.name}</div>
      <PickerRecord setValue={(field, value) => setForm(value)} />
      <Button
        onClick={() => handleSaveResult()}
        label={saved ? 'List' : 'Guardar'}
      />
    </div>
  )
}

const Participant = ({ athleteId, handleAddCompetitor }) => {
  const { athlete } = useAthlete(athleteId)
  if (athlete === undefined) return <Loading />
  return (
    <div>
      <div className="flex w-full justify-evenly">
        {athlete?.name}
        <Button
          variant=""
          iconOnly
          size="xs"
          onClick={() => handleAddCompetitor(athlete)}
        >
          <AddIcon />
        </Button>
      </div>
    </div>
  )
}
