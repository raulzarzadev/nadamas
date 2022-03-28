import { deleteTeam, getUserTeams } from '@/firebase/teams'
import Link from '@comps/Link'
import ModalDelete from '@comps/Modal/ModalDelete'
import Section from '@comps/Section'
import { useState, useEffect } from 'react'
export default function CoachSection({ user }) {
  const [userTeams, setUserTeams] = useState([])

  useEffect(() => {
    getAndSetUserTeams()
  }, [])

  const getAndSetUserTeams = () => {
    getUserTeams(user.id).then(setUserTeams)
  }

  console.log(userTeams)

  return (
    <Section title={'Perfil de entrenador'}>
      <Section title={'Equipos'}>
        {!userTeams?.length && (
          <div>
            <p>No tienes equipos asignados</p>
          </div>
        )}
        <div className="text-center">
          <Link href={'/teams/new'} className="btn btn-outline btn-sm">
            Nuevo equipo
          </Link>
        </div>
        {userTeams?.map((team) => (
          <div key={team.id} className="flex">
            <ModalDelete
              handleDelete={deleteTeam}
              itemId={team.id}
              labelDelete={`Equipo: ${team.name || team.title}`}
              deleteSuccessful={() => {
                console.log('delete success')
                getAndSetUserTeams()
              }}
            />
            <Link href={`/teams/${team.id}`}>
              <h3>{team.name || team.title}</h3>
            </Link>
          </div>
        ))}
      </Section>
      <Section title={'Eventos'}></Section>
      <Section title={'Configuración'}></Section>
    </Section>
  )
}
