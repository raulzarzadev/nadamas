import { ROUTES } from '@/legasy/ROUTES'
import { useAuth } from '@/legasy/src/context/AuthContext'
import { AddIcon } from '@/legasy/src/utils/Icons'
import AthleteRow from '@/legasy/src/components/AthleteRow'
import Button from '@/legasy/src/components/inputs/Button'
import Section from '@/legasy/src/components/Section'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function TeamsView() {
  const router = useRouter()
  const { user } = useAuth()
  const [teams, setTeams] = useState([])
  useEffect(() => {
    setTeams([
      {
        id: '1',
        coach: `${user?.name}`,
        userId: user?.id,
        title: 'Trilocos BCS',
        athletes: [
          {
            active: true,
            birth: 1224115200000,
            emerMobile: '6121118071',
            emerName: 'Javier',
            emerTitle: 'Papa',
            id: 'HM04HjUcGz7phHm1DLxL',
            lastName: 'Aguilar ',
            mobile: '6121038578',
            name: 'Diego Ezequiel',
            schedule: [],
            userId: 'osdRhDFpycZCa2e6o7QdEsDRbzw2'
          },
          {
            active: true,
            birth: 1176508800000,
            emerMobile: '6121022142',
            emerName: 'AnaKarina',
            emerTitle: 'Mama',
            id: 'KfUHvev3EdWfo8iyfah0',
            lastName: 'Laudino',
            mobile: '6122020482',
            mothersLastName: 'Pelaes',
            name: 'Maia',
            schedule: [],
            userId: 'osdRhDFpycZCa2e6o7QdEsDRbzw2'
          }
        ]
      }
    ])
  }, [user])

  return (
    <div className="">
      <div className="flex ">
        <Button
          size="xs"
          variant="secondary"
          onClick={() => router.push(ROUTES.teams.new())}
        >
          <div className="flex items-center">
            Crear equipo
            <AddIcon />
          </div>
        </Button>
      </div>
      {teams.map((team) => (
        <div key={team?.id}>
          <Section title={team.title} indent={false}>
            <div className="text-center">{team?.title}</div>
            <div className="text-sm font-extralight text-center">
              {team.coach}
            </div>
            {team.athletes?.map((athlete) => (
              <AthleteRow key={athlete.id} athlete={athlete} />
            ))}
          </Section>
        </div>
      ))}
    </div>
  )
}
