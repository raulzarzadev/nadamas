import { getAthlete, getAthleteId } from '@/firebase/athletes'
import Button from '@comps/inputs/Button'
import { useEffect, useState } from 'react'

export default function RequestRows({
  athletesIds,
  onAcceptRequest = () => {},
  onRejectRequest = () => {}
}) {
  const [athletes, setAthletes] = useState([])

  useEffect(() => {
    const athletes = athletesIds.map(async (athleteId) => {
      const res = await getAthleteId(athleteId)
      return { ...res, id: athleteId }
    })
    Promise.all(athletes).then(setAthletes)
    return () => {
      setAthletes([])
    }
  }, [athletesIds])

  return (
    <div className="">
      {!athletes.length && 'No hay solicitudes'}
      {athletes?.map((athlete) => (
        <div key={athlete?.id} className="flex justify-evenly">
          <div>{athlete?.name}</div>
          {console.log(`athlete`, athlete)}
          <div className="flex">
            <Button
              size="xs"
              variant=""
              onClick={() => onRejectRequest(athlete.id)}
            >
              Declinar
            </Button>
            <Button size="xs" onClick={() => onAcceptRequest(athlete.id)}>
              Aceptar
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
