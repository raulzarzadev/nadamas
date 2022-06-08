import { listenAthleteTeams } from '@/firebase/teams'
import Section from '@comps/Section'
import { useState, useEffect } from 'react'
import TeamCard from '../TeamCard'
export default function AthleteTeamsSection({ userId, openSection = false }) {
  const [userTeams, setUserTeams] = useState([])

  useEffect(() => {
    listenAthleteTeams(userId, setUserTeams)
  }, [])

  return (
    <Section title="Equipos" subtitle='A los que perteneces' open={openSection}>
      {!userTeams.length && (
        <div>
          <p>Aun no estas en un equipo</p>
        </div>
      )}
      <div className="grid gap-2">
        {userTeams.map((team) => (
          <TeamCard key={team.id} team={team} redirectTeam athleteView />
        ))}
      </div>
    </Section>
  )
}
