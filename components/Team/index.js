import { getTeam } from '@/firebase/teams'
import ButtonJoinTeam from '@comps/Inputs/ButtonJoinTeam'
import Loading from '@comps/Loading'
import { useState, useEffect } from 'react'
export default function Team({ teamId }) {
  const [team, setTeam] = useState(null)
  useEffect(() => {
    getTeam(teamId).then(setTeam)
  }, [])

  if (!team) return <Loading />
console.log('team', team)
  const { name, title, description, image, members = [] } = team
  return (
    <div className="">
      <div
        style={{ backgroundImage: image }}
        className="bg-green-50 h-10"
      ></div>
      <h1 className="text-center text-xl">{name || title}</h1>
      <p>{description}</p>
      <div>
        <ButtonJoinTeam
          teamId={teamId}
          membersList={team?.members || []}
          requestList={team?.joinRequests || []}
        />
      </div>
      {members?.map((member) => (
        <div>
          <p>{member?.name}</p>
        </div>
      ))}
    </div>
  )
}
