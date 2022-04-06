import { useUser } from '@/context/UserContext'
import { getUser } from '@/firebase/users'
import teams from '@/pages/teams'
import ButtonJoinTeam from '@comps/Inputs/ButtonJoinTeam'
import router from 'next/router'
import { useEffect, useState } from 'react'

export default function TeamCard({
  redirectTeam = false,
  team
  // athleteView = false
}) {
  const [teamOwner, setTeamOwner] = useState(false)
  const { user } = useUser()
  useEffect(() => {
    if (user)
      // if coach, owner or coach setOwner as true
      setTeamOwner(
        user?.id === team?.coach?.id || user.id === team?.userId || user.isCoach
      )
  }, [user])

  console.log(team)

  return (
    <CardV2 team={team} teamOwner={teamOwner} redirectTeam={redirectTeam} />
  )
}

const CardV1 = ({ team, teamOwner, redirectTeam }) => (
  <div
    className=" bg-base-300 p-2 rounded-lg shadow-lg w-full"
    onClick={(e) => {
      e.preventDefault()
      e.stopPropagation()
      if (redirectTeam) {
        router.push(`/teams/${team.id}`)
      }
    }}
  >
    <div className="flex w-full justify-between items-center">
      <div className="flex justify-between">
        <div className="">
          <h4 className="">{team?.title || team?.name} </h4>
          <p>
            <span className="font-thin text-sm">
              ({team.athletes?.length || team?.members?.length || 0})
            </span>
            <span className="text-xs font-thin mx-2">
              {team?.isPublic ? 'Público' : 'Privado'}
            </span>
            <span className="text-xs font-thin ">{teamOwner && ' (Tuyo)'}</span>
          </p>
          <p className="font-extralight ">{team?.coach?.name} </p>
        </div>
        <div className="text-right">
          <p>{team?.description}</p>
        </div>
      </div>
      {!teamOwner && (
        <div className="w-1/3">
          <ButtonJoinTeam
            membersList={team?.members}
            requestList={team?.joinRequests}
            teamId={team.id}
          />
        </div>
      )}
    </div>
    {teamOwner && (
      <div>
        <p className="font-extralight text-left">
          Solicitudes pendientes:
          <span className="font-normal">
            {team?.joinRequests?.length || '0'}
          </span>
        </p>
      </div>
    )}
  </div>
)

const CardV2 = ({
  team: {
    name,
    userId,
    description,
    members = [],
    joinRequests = [],
    isPublic,
    id
  },
  redirectTeam,
  teamOwner
}) => {
  const [coach, setCoach] = useState(null)
  useEffect(() => {
    getUser(userId).then(setCoach)
  }, [])
  return (
    <div
      className=" bg-base-300 p-2 rounded-lg shadow-lg w-full grid"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (redirectTeam) {
          router.push(`/teams/${id}`)
        }
      }}
    >
      <div className="flex justify-end text-sm font-thin ">
        {teamOwner && <p className="mx-1">tuyo</p>}
        <p className="mx-1">{isPublic ? 'publico' : 'privado'}</p>
        <p className="mx-1">{members.length}</p>
        {teamOwner && (
          <p className="mx-1">
            <span className="font-bold">{joinRequests.length}</span>
          </p>
        )}
      </div>
      <div>
        <h3 className="font-bold text-lg">
          {name}
          <span className="font-thin text-sm mx-2">
            {coach?.alias || coach?.name}
          </span>
        </h3>
      </div>
      <div className="text-sm">
        <p>{description}</p>
      </div>
    </div>
  )
}
