import { ROUTES } from '@/ROUTES'
import { AddIcon } from '@/src/utils/Icons'
import Button from '@comps/inputs/Button'
import TeamsList from '@comps/Teams/TeamsList.js'
import { useRouter } from 'next/router'

export default function Teams() {
  const router = useRouter()

  const handleClick = () => {
    router.push(ROUTES.teams.new())
  }
  return (
    <div className="max-w-md mx-auto">
      <div className="flex w-1/4 mx-auto py-2">
        <Button onClick={handleClick} size="xs">
          Nuevo equipo
          <AddIcon size="3rem" />
        </Button>
      </div>
      <TeamsList />
    </div>
  )
}
