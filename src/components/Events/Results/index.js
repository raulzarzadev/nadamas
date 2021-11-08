import { getEventResults } from '@/firebase/events'
import { ROUTES } from '@/ROUTES'
import { STYLES } from '@/src/constants/SWIMMING_TESTS'
import Button from '@comps/inputs/Button'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function Results() {
  const [results, setResults] = useState([])
  const router = useRouter()
  const {
    query: { id: eventId }
  } = router

  useEffect(() => {
    if (eventId)
      getEventResults(eventId)
        .then((res) => {
          setResults(res)
          console.log(`res`, res)
        })
        .catch((err) => console.log(`err`, err))
  }, [eventId])
  const handleClickNew = () => {
    router.push(`${ROUTES.events.results(eventId)}/new`)
  }
  return (
    <div className="">
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
      {/* ----------------------  RESULTS TABLE  ---------------------- */}
      <div className="max-w-lg mx-auto p-1 mt-3">
        <ResultRow isTitle texts={['No.', 'Prueba', 'Tiempo']} />
        {results.map(({ athlete, test }) => (
          <ResultRow
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
