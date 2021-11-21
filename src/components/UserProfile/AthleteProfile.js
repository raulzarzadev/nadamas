import { getAthleteAwards } from '@/firebase/athletes'
import useAthlete from '@/src/hooks/useAthlete'
import { useEffect, useState } from 'react'

export default function AthleteProfile({ athleteId }) {
  const { athlete } = useAthlete(athleteId)
  const [awards, setAwards] = useState([])

  useEffect(() => {
    getAthleteAwards(athleteId)
      .then((res) => console.log(`res`, res))
      .catch((err) => console.log(`err`, err))
  }, [])

  return (
    <div className="">
      <div>
        <h3 className="font-bold text-xl">Premios</h3>
      </div>
      <div>
        <h3 className="font-bold text-xl">Pruebas</h3>
      </div>
      <div>
        <h3 className="font-bold text-xl">Los mejores</h3>
      </div>
      <div>
        <h3 className="font-bold text-xl">Eventos</h3>
      </div>
      <div>
        <h3 className="font-bold text-xl">Información</h3>
      </div>
    </div>
  )
}
