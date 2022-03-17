import { acceptTeamRequest, rejectTeamRequest } from "@/firebase/teams"
import RequestRows from "@comps/AthleteRow/RequestRows"

function JoinTeamRequests({ teamId, requests = [] }) {
  const handleAcceptRequest = (athleteId) => {
    acceptTeamRequest(teamId, athleteId)
      .then((res) => {
        console.log(`res`, res)
      })
      .catch((err) => console.log(`err`, err))
  }
  const handleRejectRequest = (athleteId) => {
    rejectTeamRequest(teamId, athleteId)
      .then((res) => {
        console.log(`res`, res)
      })
      .catch((err) => console.log(`err`, err))
  }

  return (
    <div>
      <RequestRows
        athletesIds={requests}
        onAcceptRequest={handleAcceptRequest}
        onRejectRequest={handleRejectRequest}
      />
    </div>
  )
}
export default JoinTeamRequests