import { getUserTeams } from '@/firebase/teams'
import Link from '@comps/Link'
import Section from '@comps/Section'
import TeamsList from '@comps/Teams/TeamsList'
import { useState, useEffect } from 'react'
export default function CoachSection({ user }) {
  const [userTeams, setUserTeams] = useState([])

  useEffect(() => {
    getAndSetUserTeams()
  }, [])

  const getAndSetUserTeams = () => {
    getUserTeams(user.id).then(setUserTeams)
  }


  return (
    <Section title={'Perfil de entrenador'} open>
      <Section title={'Mis equipos'} >
        {!userTeams?.length && (
          <div>
            <p>No tienes equipos asignados</p>
          </div>
        )}
        <div className="text-center pb-2">
          <Link href={'/teams/new'} className="btn btn-outline btn-sm">
            Nuevo equipo
          </Link>
        </div>
        <div className='max-h-80 overflow-auto'>
          <TeamsList coachId={user.id} teams={userTeams} />
        </div>

      </Section>
      <Section title={'Mis eventos'}></Section>
      {/*  
      <Section title={'Configuración'}></Section> */}
    </Section>
  )
}
