
import TeamDetails from '@comps/Teams/TeamDetails'
import { useRouter } from 'next/router'
 function team() {
  const {
    query: { id }
  } = useRouter()
  return (
      <TeamDetails teamId={id} />
  )
}


export default team
