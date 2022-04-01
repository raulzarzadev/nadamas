import authRoute from '@comps/HOC/authRoute'
import Teams from '@comps/Teams'

function TeamsPage() {
  return <Teams />
}

export default authRoute(TeamsPage)
