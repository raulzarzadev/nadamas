import {
  cancelTeamRequest,
  getPublicTeams,
  sendTeamRequests,
  unjoinTeam,
} from '@/firebase/teams'
import { useAuth } from '@/src/context/AuthContext'
import Loading from '@comps/Loading'
import { useState, useEffect } from 'react'

export default function AthleteTeam({athleteId}) {
  const [teams, setTeams] = useState([])
  const { user } = useAuth()
  useEffect(() => {
    getPublicTeams()
      .then(setTeams)
      .catch((err) => console.log(`err`, err))
  }, [])

  return (
    <div className="p-1">
      {teams.map((team) => (
        <TeamCard key={team.id} team={team} athleteId={user.athleteId} />
      ))}
    </div>
  )
}
const TeamCard = ({ team, athleteId }) => {
  const [responseStatus, setResponseStatus] = useState(undefined)

  const handleJoin = (teamId) => {
    sendTeamRequests(teamId, athleteId)
      .then((res) => {
        setResponseStatus(REQUEST_RESPONSES[1])
        console.log(`res`, res)
      })
      .catch((err) => console.log(`err`, err))
  }
  const handleCancelRequest = (teamId) => {
    cancelTeamRequest(teamId, athleteId)
      .then((res) => {
        setResponseStatus(REQUEST_RESPONSES[0])
        console.log(`res`, res)
      })
      .catch((err) => console.log(`err`, err))
  }

  const handleUnjoin = (teamId) => {
    unjoinTeam(teamId, athleteId)
      .then((res) => {
        setResponseStatus(REQUEST_RESPONSES[0])
        console.log(`res`, res)
      })
      .catch((err) => console.log(`err`, err))
  }

  const REQUEST_RESPONSES = {
    0: {
      type: 'NOT_JOINED',
      label: 'Unirse',
      handleClick: handleJoin
    },
    1: {
      type: 'WATING_RESPONSE',
      label: 'Cancelar unirse',
      handleClick: handleCancelRequest
    },
    2: {
      type: 'REQUEST_REJECTED',
      label: 'Solicitud rechazada',
      handleClick: () => {
        console.log('solicitud rechada')
      }
    },
    3: {
      type: 'ALREDY_JOINED',
      label: 'Salir',
      handleClick: handleUnjoin
    }
  }

  const getRequestStatus = (athleteId, { joinRequests, athletes }) => {
    if (joinRequests?.includes(athleteId)) {
      return REQUEST_RESPONSES[1]
    } else {
    }
    if (athletes?.includes(athleteId)) {
      return REQUEST_RESPONSES[3]
    } else {
      return REQUEST_RESPONSES[0]
    }
  }

  useEffect(() => {
    setResponseStatus(getRequestStatus(athleteId, team))
  }, [])
  const disabled = !athleteId || responseStatus?.type === 'REQUEST_REJECTED'
  return (
    <div
      key={team.id}
      className="bg-gray-600 p-2 rounded-lg shadow-lg w-full flex items-center justify-between my-2"
    >
      <button
        disabled={disabled}
        className={` p-1  ${disabled ? 'border-none' : 'border'}`}
        onClick={() => responseStatus?.handleClick(team.id)}
      >
        {!!!responseStatus ? <Loading /> : responseStatus?.label}
      </button>
      <div>
        <h4 className="text-right">
          {team.title}
          <span className="font-thin text-sm">({team.athletes?.length})</span>
        </h4>
        <p className="font-extralight text-right">{team.coach.name}</p>
      </div>
    </div>
  )
}
