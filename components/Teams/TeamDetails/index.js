import { useUser } from '@/context/UserContext'
import { getTeam } from '@/firebase/teams'
import ButtonJoinTeam from '@comps/Inputs/ButtonJoinTeam'
import Loading from '@comps/Loading'
import Section from '@comps/Section'
import TeamMember from '@comps/TeamMember'
import { useState, useEffect } from 'react'
export default function TeamDetails({ teamId }) {
  const [team, setTeam] = useState(null)
  const { user } = useUser()
  useEffect(() => {
    getTeam(teamId).then(setTeam)
  }, [])

  const isOwner = user?.id === team?.coach?.id || user.id === team?.userId

  if (!team) return <Loading />
  console.log('team', team)
  const {
    name,
    title,
    description,
    image,
    members = [],
    joinRequests = [],
    isPublic,
    userId,
    coachId,
    createdAt
  } = team
  return (
    <div className="">
      <div
        style={{ backgroundImage: image }}
        className="bg-green-50 h-10"
      ></div>
      <div className="text-center">git c
        <h1 className="text-xl ">{name || title}</h1>
        <p className="">
          Equipo <span>{isPublic ? 'publico' : 'privado'}</span>
        </p>
        {isOwner && <p className="font-thin italic">Eres dueño</p>}
        <p>{description}</p>
      </div>

      <div>
        <ButtonJoinTeam
          disabled={isOwner}
          teamId={teamId}
          membersList={team?.members || []}
          requestList={team?.joinRequests || []}
        />
      </div>
      <Section
        open
        title={'Integrantes'}
        subtitle={`(${members?.length || 0})`}
      >
        {members?.map((memberId) => (
          <div>
            <p>{memberId}</p>
          </div>
        ))}
      </Section>
      {isOwner && (
        <Section
          title={`Solicitudes `}
          subtitle={`(${joinRequests?.length || 0})`}
        >
          {joinRequests?.map((memberId) => (
            <div>
              <TeamMember memberId={memberId} />
              <p>{memberId}</p>
            </div>
          ))}
        </Section>
      )}
    </div>
  )
}
