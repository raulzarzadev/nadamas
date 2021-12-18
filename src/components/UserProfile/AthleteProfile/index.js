import { getAthleteAwards, getAthleteResults } from '@/firebase/results'
import { getAthleteEvents } from '@/firebase/events'
import { ROUTES } from '@/ROUTES'
import STATUS_EVENT from '@/src/constants/STATUS_EVENT'
import { formatInputDate } from '@/src/utils/Dates'
import AthleteTeam from '@comps/Athlete/AthleteTeam'
import FormAthlete from '@comps/Athlete/FormAthlete2'
import Payments from '@comps/Athlete/Payments'
import SwimTestDetails from '@comps/Modals/SwimTestDetails'
import AthleteSchedule from '@comps/Schedules/AthleteSchedule'
import Section from '@comps/Section'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import AwardBadge from './AwardBadge'
import ResultsRow from './ResultsRow'

export default function AthleteProfile({ athleteId }) {
  const [awards, setAwards] = useState(undefined)
  useEffect(() => {
    getAthleteAwards(athleteId)
      .then(setAwards)
      .catch((err) => console.log(`err`, err))
  }, [])

  const [athleteResults, setAthleteResults] = useState([])
  useEffect(() => {
    getAthleteResults(athleteId, setAthleteResults)
    return () => {
      setAthleteResults([])
    }
  }, [])

  const [athleteEvents, setAthleteEvents] = useState([])

  useEffect(() => {
    getAthleteEvents(athleteId)
      .then(setAthleteEvents)
      .catch((err) => console.log(`err`, err))
  }, [])

  return (
    <div className="max-w-xl mx-auto ">
      <div>
        <h3 className="">Premios ganados</h3>
        <div className="flex ">
          {awards?.resultsAwards?.map((result) => (
            <AwardsRow key={result.id} result={result} />
          ))}
        </div>
      </div>

      <div>
        <h3>Ultimos resultados</h3>
        <ResultsRow results={athleteResults} />
      </div>

      <div>
        <h3 className="">Eventos asistidos</h3>
        <div className="grid grid-flow-col gap-5 px-5 py-2 overflow-auto">
          {athleteEvents.map((event) => (
            <EventCard key={event.id} event={event} athleteId={athleteId} />
          ))}
        </div>
      </div>

      <div>
        <FormAthlete athleteId={athleteId} />
      </div>

      <div>
        <h3 className="">Equipos </h3>
        <div className="grid grid-flow-col gap-5 px-5 py-2 overflow-auto">
          <AthleteTeam athleteId={athleteId} />
        </div>
      </div>

      <div>
        <Section title="Cuotas" indent={false}>
          <Payments athleteId={athleteId} />
        </Section>
      </div>

      <div>
        <Section title={'Horario'} indent={false}>
          <AthleteSchedule athleteId={athleteId} />
        </Section>
      </div>
    </div>
  )
}
const EventCard = ({ event, athleteId }) => {
  const router = useRouter()
  return (
    <button
      onClick={() => router.push(ROUTES.events.details(event.id))}
      className="border w-32 rounded-b-xl  "
    >
      <div className="bg-red-400 text-center">
        {formatInputDate(event.date, 'dd MMM yy')}
      </div>
      <div className="text-center">{event.title}</div>
      <div className="my-2 text-center">
        Prticipante No.
        {event.participants.find(({ id }) => id === athleteId)?.number}
      </div>
      <div>
        <div>
          <div
            className={`${
              STATUS_EVENT[event.status]?.color
            }  rounded-b-xl text-center`}
          >
            {STATUS_EVENT[event.status].label}
          </div>
        </div>
      </div>
    </button>
  )
}

const AwardsRow = ({ result }) => {
  const { awards } = result?.test
  const [openTestDetails, setOpenTestDetails] = useState(false)
  const handleOpenTestDetails = () => {
    setOpenTestDetails(!openTestDetails)
  }
  return (
    <div>
      {awards?.map((award) => (
        <button
          onClick={(e) => {
            e.preventDefault()
            handleOpenTestDetails()
          }}
          key={award}
        >
          <AwardBadge award={award} />
        </button>
      ))}
      <SwimTestDetails
        result={result}
        open={openTestDetails}
        handleOpen={handleOpenTestDetails}
      />
    </div>
  )
}
