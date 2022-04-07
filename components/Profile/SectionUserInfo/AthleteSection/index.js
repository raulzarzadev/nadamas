import {
  getAthleteRecords,
  getAthleteResults,
  getUserAthlete
} from '@/firebase/athletes'
import { dateFormat } from '@/utils/dates'
import Section from '@comps/Section'
import { useState, useEffect } from 'react'

export default function AthleteSection({ userId }) {
  // TODO get athletes information fron athletesId and userId. for legasy info
  // *** this options are for legasy info

  const [athlete, setAthlete] = useState()
  useEffect(() => {
    if (userId) getUserAthlete(userId).then(setAthlete)
  }, [])

  const [records, setRecords] = useState([])
  const [results, setResults] = useState([])

  useEffect(() => {
    if (athlete) {
      getAthleteRecords(athlete.id).then(setRecords)
      getAthleteResults(athlete.id).then(setResults)
    }
  }, [athlete])

  console.log(records, results)

  // *** this options are for legasy info

  return (
    <Section title="Registros">
      <div>
        {results.map(({ id, test, date }) => (
          <div key={id} className="flex justify-between text-sm">
            <div className="p-0.5 justify-end flex   w-[30%]">
              {date ? dateFormat(date, 'dd MMM yy') : '-'}
            </div>
            <div className="p-0.5 justify-end flex w-[15%] ">
              {test.distance}
            </div>
            <div className="p-0.5 flex justify-center w-[25%] ">
              {test.style}
            </div>
            <div className="p-0.5 flex justify-start w-[30%] ">
              {test.record}
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}
