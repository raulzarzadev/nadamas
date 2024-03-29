import { listenUserEvents } from '@/firebase/events'
import { getUserTeams } from '@/firebase/teams'
import EventsList from '@comps/Events/EventsList'
import Link from '@comps/Link'
import Section from '@comps/Section'
import TeamsList from '@comps/Teams/TeamsList'
import { useState, useEffect } from 'react'
import MainModal from '../../../Modal/MainModal'
import { SquareAdd } from '../../../SquareAdd'
import TeamForm from '../../../Teams/TeamForm'
import TeamSquare from '../../../Teams/TeamSquare'
export default function CoachSection({ user }) {
  const [userTeams, setUserTeams] = useState([])

  useEffect(() => {
    getAndSetUserTeams()
  }, [])

  const getAndSetUserTeams = () => {
    getUserTeams(user.id).then(setUserTeams)
  }

  /*  const [userEvents, setUserEvets] = useState()
 
   useEffect(() => {
     listenUserEvents(setUserEvets)
   }, []) */

  const sortByUpdatedAt = (a, b) => {
    return b.updatedAt - a.updatedAt
  }
  return (
    <>
      <div>
        <h3 className='text-lg font-bold'>Mis equipos</h3>
        <div className="grid grid-flow-col overflow-auto gap-4 p-2">
          <div className='w-28'>
            <MainModal title={'Nuevo equipo'} OpenComponent={SquareAdd} OpenComponentProps={{id:'new-team'}}>
              <TeamForm />
            </MainModal>
          </div>
          {userTeams?.sort(sortByUpdatedAt).map((team) => (
            <TeamSquare team={team} key={team.id} />
          ))}
        </div>

      </div>
      {/*  <Section title={'Perfil de entrenador'} open>
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

        </Section> */}
      {/*  <Section title={'Mis eventos'}>
        <div className="text-center pb-2">
          <Link href={'/events/new'} className="btn btn-outline btn-sm">
            Nuevo evento
            </Link>
            </div>
            <EventsList events={userEvents} />
          </Section> */}
      {/*  
      <Section title={'Configuración'}></Section> */}
      {/*  </Section> */}
    </>
  )
}
