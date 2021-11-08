import { getAthleteId } from "@/firebase/athletes"
import { useEffect, useState } from "react"

export default function useAthlete(athleteId) {
  const [athlete, setAthlete] = useState(undefined)
  useEffect(() => {
    if (athleteId) {
      getAthleteId(athleteId)
        .then((res) => {
          console.log(`res`, res)
          if (res) {
            setAthlete(res)
          } else {
            setAthlete({ id: athlete, active: false })
          }
        })
        .catch((err) => console.log(`err`, err))
      return () => {
        setAthlete(undefined)
      }
    }
  }, [athleteId])
  return { athlete }
}
