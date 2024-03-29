import { getEvent } from '@/legasy/firebase/events'
import { addEventResult } from '@/legasy/firebase/results'
import useAthlete from '@/legasy/src/hooks/useAthlete'
import { getAge } from '@/legasy/src/utils/Dates'
import { AddIcon, DoneIcon, SaveIcon } from '@/legasy/src/utils/Icons'
import Button from '@/legasy/src/components/inputs/Button'
import PickerRecord from '@/legasy/src/components/inputs/PickerRecord'
import PickerTest from '@/legasy/src/components/inputs/PickerTest'
import Loading from '@/components/Loading'
import Modal from '@/legasy/src/components/Modals/Modal'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function FormResults() {
  const [event, setEvent] = useState(undefined)
  const router = useRouter()
  const {
    query: { id: eventId, style, distance }
  } = router
  useEffect(() => {
    if (eventId) {
      getEvent(eventId, setEvent)
    } else {
      setEvent(null)
    }
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

  useEffect(() => {
    if (style || distance) {
      setTest({ style, distance })
    }
  }, [style, distance])
  if (event === undefined) return <Loading />
  return (
    <div className="max-w-md mx-auto">
      <h3 className="text-center text-2xl">Nuevo resultado</h3>
      <div className="">
        <PickerTest test={test} setTest={(test) => setTest(test)} />
      </div>
      <div className="flex justify-center my-3 items-center flex-col ">
        <h4 className="text-center text-xl mx-3">Competidores </h4>
        <div className="flex">
          <Button
            onClick={handleOpenParticipants}
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
            <div className="font-bold">No.</div>
            <div className="font-bold">Nombre</div>
            <div className="font-bold">Acción</div>
          </div>
          {event?.participants?.map((participant) => (
            <Participant
              competitors={competitors}
              participant={participant}
              key={participant?.id}
              handleAddCompetitor={handleAddCompetitor}
            />
          ))}
        </Modal>
      </div>
      <div className='flex w-full justify-center'>

      <Button
        variant="secondary"
        label="Regresar"
        onClick={() => router.back()}
        />
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
        number: athlete.number,
        age: getAge(athlete.birth)?.split(' ')?.[0]
      },
      test: { ...test, record: form },
      // TODO verificar que se guarde con la fecha del evento si es que existe
      date: event?.date || new Date()
    }
    addEventResult(resultData)
      .then((res) => console.log(`res`, res))
      .catch((err) => console.log(`err`, err))
    setSaved(true)
  }
  const [form, setForm] = useState('')
  const [openRecord, setOpenRecord] = useState(false)
  const handleOpenRecord = () => {
    setOpenRecord(!openRecord)
  }

  return (
    <div className="flex items-center justify-between w-full  my-2">
      <div className="w-1/12 text-right pr-1 z font-bold text-xl">
        {athlete.number}
      </div>
      <div className="w-2/6">{athlete.name}</div>
      <div className="w-3/6">
        <div
          className="flex w-full justify-center items-center"
          onClick={handleOpenRecord}
        >
          {form}
        </div>
        <Modal open={openRecord} handleOpen={handleOpenRecord} title='Record'>
          <PickerRecord setValue={(field, value) => setForm(value)} size="sm" />
        </Modal>
      </div>
      <div className="w-1/6 flex justify-center">
        <Button
          onClick={() => handleSaveResult()}
          iconOnly
          size="xs"
          variant={saved ? 'secondary' : 'primary'}
        >
          {saved ? <DoneIcon /> : <SaveIcon />}
        </Button>
      </div>
    </div>
  )
}

const Participant = ({ participant, handleAddCompetitor, competitors }) => {
  const { athlete } = useAthlete(participant.id)
  const { number } = participant
  const competitorAlreadyAdded = competitors.find(
    ({ id }) => id === participant.id
  )
  if (athlete === undefined) return <Loading />
  return (
    <div className="flex w-full justify-evenly text-sm">
      <div className="py-1 w-1/6 flex justify-center items-center">
        {number}
      </div>
      <div className="py-1 w-1/2 flex justify-center items-center">
        {`${athlete.name?.split(' ')[0]} ${athlete.name?.split(' ')[1] || ''}`}
      </div>
      <div className="py-1 w-1/6 flex justify-center items-center">
        <Button
          variant={!!competitorAlreadyAdded ? 'secondary' : 'primary'}
          iconOnly
          size="xs"
          onClick={() => handleAddCompetitor({ ...athlete, number })}
        >
          {!!competitorAlreadyAdded ? (
            <DoneIcon size="1rem" />
          ) : (
            <AddIcon size="1rem" />
          )}
        </Button>
      </div>
    </div>
  )
}
