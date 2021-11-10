import { getEvent, getEventResults } from '@/firebase/events'
import { ROUTES } from '@/ROUTES'
import { STYLES } from '@/src/constants/SWIMMING_TESTS'
import { useAuth } from '@/src/context/AuthContext'
import { getAge } from '@/src/utils/Dates'
import Button from '@comps/inputs/Button'
import PickerTests from '@comps/inputs/PickerTests'
import Modal from '@comps/Modals/Modal'
import { formatDistanceToNowStrict } from 'date-fns'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

const getTestLabelES = ({ test }) => {
  if (!test) return null
  const sty = STYLES.find(({ id }) => id === test?.style)
  return {
    smLabel: `${test?.distance} ${sty?.label}`,
    mdLabel: `${test?.distance}m ${sty?.largeLabel}`
  }
}
export default function Results() {
  const [results, setResults] = useState([])
  const router = useRouter()
  const {
    query: { id: eventId }
  } = router
  const [event, setEvent] = useState({})

  useEffect(() => {
    if (eventId)
      getEventResults(eventId)
        .then((res) => {
          setResults(res)
        })
        .catch((err) => console.log(`err`, err))
    getEvent(eventId, setEvent)
  }, [eventId])
  const handleClickNew = () => {
    router.push(`${ROUTES.events.results(eventId)}/new`)
  }
  const [filter, setFilter] = useState(null)
  const [fiteredResults, setFiteredResults] = useState(null)

  const handleClickTest = async (test) => {
    setFilter(test)
  }

  useEffect(() => {
    const res = results.filter(
      ({ test: { distance, style } }) =>
        distance === filter?.distance && style === filter?.style
    )
    setFiteredResults(res)
  }, [results, filter])

  const [sortBy, setSortBy] = useState('record')
  const sortResultsBy = (a, b) => {
    if (a.test[sortBy] < b.test[sortBy]) return -1
    if (a.test[sortBy] > b.test[sortBy]) return 1
    return 0
  }
  const [openFilters, setOpenFilters] = useState()
  const handleOpenFilters = () => {
    setOpenFilters(!openFilters)
  }
  const { user } = useAuth()

  const isAdmin = user?.id === event?.owner?.id

  return (
    <div className="">
      <div className="text-center">
        <h3 className="text-xl">{event?.title}</h3>
        <p>Participantes {event?.participants?.length}</p>
      </div>
      {isAdmin && (
        <div className="flex justify-center pt-5">
          <div className="w-28">
            <Button
              size="sm"
              variant="secondary"
              label="Nuevo"
              type="button"
              onClick={handleClickNew}
            />
          </div>
        </div>
      )}
      <div>
        <Modal open={openFilters} handleOpen={handleOpenFilters}>
          <h3 className="text-xl text-center mt-4">Pruebas nadadas</h3>
          <PickerTests
            tests={results.map((res) => res.test)}
            onTestClick={(test) => {
              setTimeout(() => {
                setOpenFilters(false)
              }, 200)
              handleClickTest(test)
            }}
            disabled
            compact
          />
        </Modal>
      </div>

      {/* ----------------------  RESULTS TABLE  ---------------------- */}
      <div className="text-center m-2">
        <button
          onClick={handleOpenFilters}
          className="text-center border p-1 text-xl w-2/3 max-w-sm"
        >
          <h4>
            {getTestLabelES({ test: filter })?.mdLabel ||
              'Selecciona un prueba'}
          </h4>
        </button>
      </div>
      <div className="max-w-lg mx-auto p-1 mt-3">
        <ResultRow isTitle texts={['No.', 'Nombre', 'Edad', 'Tiempo']} />
        {fiteredResults?.length === 0 && (
          <div className="text-center my-4">Aún no hay resultados</div>
        )}
        {fiteredResults?.sort(sortResultsBy).map(({ id, athlete, test }, i) => (
          <ResultRow
            key={id}
            place={i}
            texts={[
              `${athlete?.number}`,
              `${athlete.name}`,
              `${getAge(athlete.birth)}`,
              `${test?.record}`
            ]}
          />
        ))}
      </div>
    </div>
  )
}

const ResultRow = ({ isTitle, texts = [], place }) => (
  <div>
    <div className="flex w-full  ">
      <div
        className={`${isTitle && 'font-bold'} w-1/6 text-center p-0.5 relative`}
      >
        {texts?.[0]}
        {place === 0 && (
          <span className="absolute text-xs right-2 -top-1">1°</span>
        )}
        {place === 1 && (
          <span className="absolute text-xs right-2 -top-1">2°</span>
        )}
      </div>
      <div className={`${isTitle && 'font-bold'} w-2/6 text-center p-0.5`}>
        {texts?.[1]}
      </div>
      <div className={`${isTitle && 'font-bold'} w-1/6 text-center p-0.5`}>
        {texts?.[2]}
      </div>
      <div className={`${isTitle && 'font-bold'} w-2/6 text-center p-0.5`}>
        {texts?.[3]}
      </div>
    </div>
  </div>
)
