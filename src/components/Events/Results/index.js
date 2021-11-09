import { getEvent, getEventResults } from '@/firebase/events'
import { ROUTES } from '@/ROUTES'
import { STYLES } from '@/src/constants/SWIMMING_TESTS'
import Button from '@comps/inputs/Button'
import PickerTests from '@comps/inputs/PickerTests'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

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
          console.log(`res`, res)
        })
        .catch((err) => console.log(`err`, err))
    getEvent(eventId, setEvent)
  }, [eventId])
  const handleClickNew = () => {
    router.push(`${ROUTES.events.results(eventId)}/new`)
  }
  const handleClickTest = (test) => {
    console.log(`test`, test)
  }
  return (
    <div className="">
      <div className="text-center">
        {console.log(`event`, event)}
        <h3 className="text-xl">{event?.title}</h3>
        <p>Participantes {event?.participants?.length}</p>
      </div>
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
      <div>
        <h3 className="text-xl text-center mt-4">Pruebas</h3>
        <PickerTests
          tests={event?.tests}
          onTestClick={handleClickTest}
          disabled
        />
      </div>

      {/* ----------------------  RESULTS TABLE  ---------------------- */}
      <h4>Filtro: </h4>
      <div className="max-w-lg mx-auto p-1 mt-3">
        <ResultRow isTitle texts={['No.', 'Prueba', 'Tiempo']} />
        {results.map(({ id, athlete, test }) => (
          <ResultRow
            key={id}
            texts={[
              `${athlete?.number}`,
              `${test?.distance}m ${
                STYLES.find(({ id }) => id === test.style).label
              }`,
              `${test?.record}`
            ]}
          />
        ))}
      </div>
    </div>
  )
}

const ResultRow = ({ isTitle, texts = [] }) => (
  <div>
    <div className="flex w-full  ">
      <div className={`${isTitle && 'font-bold'} w-1/6 text-center p-0.5`}>
        {texts?.[0]}
      </div>
      <div className={`${isTitle && 'font-bold'} w-3/6 text-center p-0.5`}>
        {texts?.[1]}
      </div>
      <div className={`${isTitle && 'font-bold'} w-2/6 text-center p-0.5`}>
        {texts?.[2]}
      </div>
    </div>
  </div>
)
