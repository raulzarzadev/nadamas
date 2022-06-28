import { useUser } from '@/context/UserContext'
import { getPublicTeams, listenPublicTeams } from '@/firebase/teams'
import Section from '@comps/Section'
import { useEffect, useState } from 'react'
import Autocomplete from 'react-autocomplete'
import AthleteTeamsSection from './AthleteTeamsSecttion'
import TeamCard from './TeamCard'

export default function Teams() {
  const { user } = useUser()
  const [teams, setTeams] = useState([])
  useEffect(() => {
    listenPublicTeams(setTeams)
  }, [])

  const [searchValue, setSearchValue] = useState('')

  useEffect(() => {
    if (searchValue.length > 0) {
      const filteredTeams = teams.filter((team) =>{
       return team.name.toLowerCase().includes(searchValue.toLowerCase()) || team.description.toLowerCase().includes(searchValue.toLowerCase())
      }
      )
      setSearchResult(filteredTeams)
    } else {
      setSearchResult([])
    }
  }, [searchValue])

  const [searchResult, setSearchResult]=useState()
  
  return (
    <div className="">
      {user &&
        <AthleteTeamsSection userId={user.id} openSection={true} />
      }
      <Section title={'Buscar equipos'} indent={false} open >
        {/* <h4 className="text-center">Equipo publicos</h4> */}
        <Autocomplete
          inputProps={{ placeholder: 'Busca equipos  y unete...', className: 'input input-outline input-bordered w-full text-center text-xl' }}
          wrapperStyle={{ width: '100%', margin:'1rem auto',zIndex: '1' }}
          getItemValue={(item) => item.label}
          items={searchResult?.map((team) => { return { label: team.name } })}
          renderItem={(item, isHighlighted) =>
            <div key={item.label} style={{ background: isHighlighted ? 'lightgray' : 'white' }}>
              {item.label}
            </div>
          }
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onSelect={(val) => setSearchValue(val)}
        ></Autocomplete>
        <div className="grid gap-2">
          {searchResult?.map((team) => (
            <TeamCard team={team} key={team.id} redirectTeam/>
          ))}
          {/*  {teams?.map((team) => (
            <TeamCard key={team.id} team={team} redirectTeam />
          ))} */}
        </div>
      </Section>
      {/*   <Section title={'Estadisiticas  '} indent={false}>
        Estadisticas de los equipos publicos
      </Section> */}
    </div>
  )
}
