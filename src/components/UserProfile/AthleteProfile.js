import { getAthleteAwards, getAthleteRecords } from '@/firebase/athletes'
import { getAthleteEvents } from '@/firebase/events'
import { ROUTES } from '@/ROUTES'
import { TEST_AWARDS } from '@/src/constants/AWARDS'
import STATUS_EVENT from '@/src/constants/STATUS_EVENT'
import { getStyleInfo } from '@/src/constants/SWIMMING_TESTS'
import { formatInputDate } from '@/src/utils/Dates'
import { averageRecordSpeed } from '@/src/utils/Records'
import AthleteTeam from '@comps/Athlete/AthleteTeam'
import FormAthlete from '@comps/Athlete/FormAthlete2'
import Payments from '@comps/Athlete/Payments'
import SwimTestDetails from '@comps/Modals/SwimTestDetails'
import AthleteSchedule from '@comps/Schedules/AthleteSchedule'
import Section from '@comps/Section'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function AthleteProfile({ athleteId }) {
  const [awards, setAwards] = useState(undefined)
  useEffect(() => {
    getAthleteAwards(athleteId)
      .then(setAwards)
      .catch((err) => console.log(`err`, err))
  }, [])

  const [eventResults, setEventResults] = useState([])
  useEffect(() => {
    getAthleteRecords(athleteId)
      .then(setEventResults)
      .catch((err) => console.log(`err`, err))
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
        <h3 className="font-bold text-md">Premios</h3>
        <div className="flex ">
          {awards?.resultsAwards?.map((result) => (
            <AwardsCard key={result.id} result={result} />
          ))}
        </div>
      </div>
      <div>
        <h3 className="font-bold text-md">Pruebas</h3>

        <div className="grid grid-flow-col overflow-auto gap-5 px-5 py-2">
          {eventResults?.map((result) => (
            <ResultCard key={result?.id} result={result} />
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-bold text-md">Eventos</h3>
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
        <h3 className="font-bold text-md">Equipos</h3>
        <div className="grid grid-flow-col gap-5 px-5 py-2 overflow-auto">
          <AthleteTeam />
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

const ResultCard = ({ result }) => {
  const { record, distance, style, awards } = result?.test
  return (
    <div className="relative text-base border h-full rounded-b-3xl w-24">
      <div className="italic text-xs flex w-full justify-center items-center bg-red-400">
        {result?.date || 'no date'}
      </div>
      <div className="absolute -top-4 -right-5">
        {awards?.map((award) => (
          <AwardPin key={award} award={award} size="xs" />
        ))}
      </div>
      <div className="p-1 text-sm text-center">
        <div>{`${distance}m `}</div>
        <div>{`${getStyleInfo(style).largeLabel}`}</div>
        <div className="text-lg font-thin">{record}</div>
        <div className="text-lg font-thin">
          {averageRecordSpeed(distance, record)}
          <span className="text-xs">ms</span>
        </div>
      </div>
    </div>
  )
}
const AwardsCard = ({ result }) => {
  const { awards } = result.test
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
          <AwardPin award={award} />
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
const AwardPin = ({ award, size = 'md' }) => {
  const sizign = {
    xs: 'w-8 h-8 text-2xl',
    sm: '',
    md: 'w-10 h-10 text-2xl',
    lg: ''
  }
  return (
    <div
      className={`${sizign[size]} m-2 text-warning  border rounded-full border-yellow-300 p-1 flex justify-center items-center`}
    >
      {TEST_AWARDS[award].icon}
    </div>
  )
}
