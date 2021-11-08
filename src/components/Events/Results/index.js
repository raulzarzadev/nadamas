import { getEventResults } from '@/firebase/events'
import { ROUTES } from '@/ROUTES'
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
      <div>
        <Button
          label="Nuevo resultado"
          type="button"
          onClick={handleClickNew}
        />
      </div>
      <div>
        {/* ----------------------  RESULTS TITLES  ---------------------- */}
        <div>
          <div>No.</div>
          <div>Prueba</div>
          <div>Rama</div>
          <div>Cat</div>
          <div>Tiempo</div>
        </div>
        {results.map((result) => (
          <Result result={result} key={result.id} />
        ))}
      </div>
    </div>
  )
}

const Result = ({result}) => {
  
  return <div>
    <div>
      
    </div>
    {console.log(`result`, result)}
  </div>
}
