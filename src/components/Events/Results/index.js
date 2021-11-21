import { getEvent, getEventResults, removeEventResult } from '@/firebase/events'
import { ROUTES } from '@/ROUTES'
import { STYLES } from '@/src/constants/SWIMMING_TESTS'
import { useAuth } from '@/src/context/AuthContext'
import { TrashBinIcon } from '@/src/utils/Icons'
import Button from '@comps/inputs/Button'
import PickerTests from '@comps/inputs/PickerTests'
import DeleteModal from '@comps/Modals/DeleteModal'
import Modal from '@comps/Modals/Modal'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import ModalAdminOptions from './ModalAdminOptions'

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

  const { user } = useAuth()
  const isAdmin = user?.id === event?.owner?.id
  const handleClickNew = () => {
    router.push(`${ROUTES.events.results(eventId)}/new`)
  }
  const FILTERS = {
    all: {
      label: 'Todas',
      Component: <ResultTable isAdmin={isAdmin} results={results} />
    },
    test: {
      label: 'Prueba',
      Component: <ResultsByTest results={results} isAdmin={isAdmin} />
    },
    /* category: {
      label: 'Categoria',
      Component: <ResultTable isAdmin={isAdmin} results={results} />
    }, */
    number: {
      label: 'Numero',
      Component: <ResultsByNumber isAdmin={isAdmin} results={results} />
    },
    /* name: {
      label: 'Nombre',
      Component: <ResultTable isAdmin={isAdmin} results={results} />
    } */
  }
  const [filterBy, setFilterBy] = useState('all')
  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center">
        <h3 className="text-xl">{event?.title}</h3>
      </div>
      <h3 className="text-2xl text-center ">Resultados</h3>
      {isAdmin && event?.status !== 'FINISH' && (
        <div className="flex justify-center my-4">
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
      {console.log(`event.status`, event.status)}
      {event?.status === 'FINISH' && <EventFinished event={event} />}
      <div className="text-center">
        <h2>Participantes: {event?.participants?.length || '0'}</h2>
        <h2>Pruebas nadadas: {results.length || '0'}</h2>
        <div>
          <h2>Filtrar por:</h2>
          <div className="flex w-full justify-evenly flex-wrap">
            {Object.keys(FILTERS).map((filter) => (
              <button
                onClick={(e) => {
                  e.preventDefault()
                  setFilterBy(filter)
                }}
                key={filter}
                className={`${
                  filterBy === filter && 'bg-blue-500'
                } border p-1 px-5 my-2 mx-1 rounded-full flex justify-center items-center`}
              >
                {FILTERS[filter].label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* ----------------------  RESULTS TABLE  ---------------------- */}
      {FILTERS[filterBy].Component}
    </div>
  )
}

const ResultsByNumber = ({ results, isAdmin }) => {
  const [filteredResults, setFilteredResults] = useState([])
  const handleFitlerResultByNumber = (filter) => {
    const find = results.filter((result) => result?.athlete?.number == filter)
    setFilteredResults(find)
  }

  const handleChange = ({ target: { value } }) => {
    handleFitlerResultByNumber(value)
  }

  return (
    <div className='text-center my-4'>
      <input
        onChange={handleChange}
        placeholder="Numero de participante"
        className="bg-gray-800 text-center p-2 text-xl w-80 mx-auto "
        type="number"
        pattern="[0-9]*"
        inputMode="numeric"
      ></input>
      <ResultTable results={filteredResults} isAdmin={isAdmin} />
    </div>
  )
}

const ResultsByTest = ({ results, isAdmin }) => {
  const [filter, setFilter] = useState(null)
  const [fiteredResults, setFiteredResults] = useState(null)
  useEffect(() => {
    if (filter) {
      const res = results?.filter(
        ({ test: { distance, style } }) =>
          distance === filter?.distance && style === filter?.style
      )
      setFiteredResults(res)
    } else {
      setFiteredResults(results)
    }
  }, [results, filter])
  const [openFilters, setOpenFilters] = useState()
  const handleOpenFilters = () => {
    setOpenFilters(!openFilters)
  }
  const [sortBy, setSortBy] = useState('record')
  const sortResultsBy = (a, b) => {
    if (a.test[sortBy] < b.test[sortBy]) return -1
    if (a.test[sortBy] > b.test[sortBy]) return 1
    return 0
  }
  return (
    <div className="">
      <button
        onClick={handleOpenFilters}
        className="text-center border p-1 text-xl w-2/3 max-w-sm mx-auto flex justify-center"
      >
        <h4 className="flex flex-col">
          {filter ? (
            <>
              <span className="font-thin text-sm">Filtro:</span>
              {getTestLabelES({ test: filter })?.mdLabel}
            </>
          ) : (
            <>
              Todos las pruebas
              <span className="font-thin">filtrar</span>
            </>
          )}
        </h4>
      </button>
      <Modal
        open={openFilters}
        handleOpen={handleOpenFilters}
        title="Filtrar pruebas"
      >
        <PickerTests
          currentSelected={filter}
          tests={results?.map((res) => res.test)}
          onTestClick={(test) => {
            setTimeout(() => {
              setOpenFilters(false)
            }, 200)
            setFilter(test)
          }}
          disabled
          compact={true}
        />
      </Modal>
      <div className="text-center m-2">
        {!!filter && (
          <div className="font-thin my-2">
            <button className="font-thin" onClick={() => setFilter(null)}>
              Limpiar filtro
            </button>
          </div>
        )}
      </div>
      <ResultTable
        results={fiteredResults}
        sortResultsBy={sortResultsBy}
        isAdmin={isAdmin}
      />
    </div>
  )
}
const ResultTable = ({ results, sortResultsBy, isAdmin }) => {
  return (
    <div className=" mx-auto p-1 mt-3">
      <ResultRow
        isTitle
        texts={['No.', 'Nombre', 'Edad', 'Prueba', 'Tiempo', 'Action']}
      />
      {results?.length === 0 && (
        <div className="text-center my-4">Aún no hay resultados</div>
      )}
      {results?.sort(sortResultsBy).map(({ id, athlete, test }, i) => (
        <ResultRow
          key={id}
          place={i}
          texts={[
            `${athlete?.number || ''}`,
            `${athlete?.name?.split(' ')?.[0] || ''}`,
            `${athlete?.age || 'sin'}`,
            `${getTestLabelES({ test }).smLabel}`,
            `${test?.record}`,
            <DetailsResultCell
              isAdmin={isAdmin}
              id={id}
              test={test}
              athlete={athlete}
            />
          ]}
        />
      ))}
    </div>
  )
}

const EventFinished = () => {
  return (
    <div>
      <div>
        <h3 className="relative text-center z-10 text-4xl font-bold my-4 bg-purple-500 transform rotate-12">
          Evento Finalizado
        </h3>
      </div>
    </div>
  )
}

const DetailsResultCell = ({ id, test, athlete, isAdmin }) => {
  const [openDetails, setOpenDetails] = useState(false)
  const handleOpenDetails = () => {
    setOpenDetails(!openDetails)
  }
  return (
    <>
      <Button
        size="xs"
        iconOnly
        variant="secondary"
        onClick={handleOpenDetails}
      >
        ver
      </Button>
      <Modal open={openDetails} handleOpen={handleOpenDetails} title="Detalles">
        <div className="text-base mb-6">
          <div className="my-2">
            Competidor No.
            <span className="font-bold text-xl"> {athlete.number}</span>
          </div>
          <div>
            {athlete.name} {athlete.lastName || ''}
          </div>
          <div className="text-2xl border my-2 ">
            {`${test.distance}m ${
              STYLES.find(({ id }) => test.style === id)?.largeLabel
            }`}
            <div className="text-2xl font-thin">{test.record}</div>
          </div>
        </div>
        {isAdmin && (
          <ModalAdminOptions
            id={id}
            test={test}
            athlete={athlete}
            closeDetails={() => setOpenDetails(false)}
          />
        )}
      </Modal>
    </>
  )
}
const ResultRow = ({ isTitle, texts = [], place }) => (
  <div>
    <div className="flex w-full my-2  ">
      <div
        className={`${
          isTitle && 'font-bold'
        }  w-1/6 p-0.5 relative text-right `}
      >
        <Cell>{texts?.[0]}</Cell>
        {/* {place === 0 && (
          <span className="absolute text-xs right-2 -top-1 ">1°</span>
        )}
        {place === 1 && (
          <span className="absolute text-xs right-2 -top-1">2°</span>
        )} */}
      </div>
      <div className={`${isTitle && 'font-bold'} w-2/6  `}>
        <Cell>{texts?.[1]}</Cell>
      </div>
      <div className={`${isTitle && 'font-bold'}  w-1/6   hidden sm:block`}>
        <Cell>{texts?.[2]}</Cell>
      </div>
      <div className={`${isTitle && 'font-bold'} w-1/6   `}>
        <Cell>{texts?.[3]}</Cell>
      </div>
      <div className={`${isTitle && 'font-bold'} w-2/6  `}>
        <Cell>{texts?.[4]}</Cell>
      </div>
      <div className={`${isTitle && 'font-bold'} w-1/6 `}>
        <Cell>{texts?.[5]}</Cell>
      </div>
    </div>
  </div>
)
const Cell = ({ children }) => (
  <div className="flex w-full justify-center items-center text-center p-0.5 h-full text-sm sm:text-base">
    {children}
  </div>
)
