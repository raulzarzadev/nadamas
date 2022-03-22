import { getAthleteId } from "@/legasy/firebase/athletes"
import { useEffect, useState } from "react"

export default function useAthlete(athleteId) {
  const [athlete, setAthlete] = useState(undefined)
  useEffect(() => {
    if (athleteId) {
      getAthleteId(athleteId)
        .then((res) => {
          if (res) {
            setAthlete(res)
          } else {
            setAthlete({ id: athleteId, active: false })
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
