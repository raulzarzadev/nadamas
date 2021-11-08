import { addEventResult, getEvent } from '@/firebase/events'
import useAthlete from '@/src/hooks/useAthlete'
import { AddIcon, DoneIcon, SaveIcon } from '@/src/utils/Icons'
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
    const competitorAlreadyAdded = competitors.find(
      ({ id }) => id === athlete.id
    )
    if (competitorAlreadyAdded) {
      const competidorRemoved = competitors.filter(
        ({ id }) => id !== athlete.id
      )
      setCompetitors(competidorRemoved)
    } else {
      setCompetitors([...competitors, athlete])
    }
  }
  const [competitors, setCompetitors] = useState([])

  const [test, setTest] = useState()
  if (event === undefined) return <Loading />
  return (
    <div className="max-w-md mx-auto">
      <h3 className="text-center text-2xl">Nuevo resultado</h3>
      <div className="">
        <PickerTest setTest={(test) => setTest(test)} />
      </div>
      <div className="flex justify-center items-center">
        <h4 className="text-center text-xl mx-3">Competidores </h4>
        <div className="flex w-16">
          <Button
            onClick={handleOpenParticipants}
            size="sm"
            variant="secondary"
          >
            Agregar
            <AddIcon />
          </Button>
        </div>
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
          <div className="flex justify-evenly text-xs mb-3">
            <div>No.</div>
            <div>Nombre</div>
            <div>Acción</div>
          </div>
          {participants.map((participant) => (
            <Participant
              competitors={competitors}
              participant={participant}
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
      athleteData: {
        id: athlete.id,
        name: athlete.name,
        number: athlete.number
      },
      test: { ...test, record: form }
    }
    addEventResult(resultData)
      .then((res) => console.log(`res`, res))
      .catch((err) => console.log(`err`, err))
    setSaved(true)
  }
  const [form, setForm] = useState({})
  return (
    <div className="flex items-center justify-evenly">
      <div>{athlete.number}</div>
      <div>{athlete.name}</div>
      <PickerRecord setValue={(field, value) => setForm(value)} size="sm" />
      <Button
        onClick={() => handleSaveResult()}
        iconOnly
        size="sm"
        variant={saved ? 'secondary' : 'primary'}
      >
        {saved ? <DoneIcon /> : <SaveIcon />}
      </Button>
    </div>
  )
}

const Participant = ({ participant, handleAddCompetitor, competitors }) => {
  const { athlete } = useAthlete(participant.id)
  const { number } = participant
  const competitorAlreadyAdded = competitors.find(
    ({ id }) => id === participant.id
  )
  console.log(`competitorAlreadyAdded`, competitorAlreadyAdded)
  if (athlete === undefined) return <Loading />
  return (
    <div className="flex w-full justify-evenly">
      <div>{number}</div>
      <div>{athlete.name}</div>
      <Button
        variant={!!competitorAlreadyAdded ? 'secondary' : 'primary'}
        iconOnly
        size="xs"
        onClick={() => handleAddCompetitor({ ...athlete, number })}
      >
        {!!competitorAlreadyAdded ? <DoneIcon /> : <AddIcon />}
      </Button>
    </div>
  )
}
