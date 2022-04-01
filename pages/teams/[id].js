import authRoute from '@comps/HOC/authRoute'
import TeamDetails from '@comps/Teams/TeamDetails'
import { useRouter } from 'next/router'
 function team() {
  const {
    query: { id }
  } = useRouter()
  return (
    <div className="">
      <TeamDetails teamId={id} />
    </div>
  )
}


export default authRoute(team)