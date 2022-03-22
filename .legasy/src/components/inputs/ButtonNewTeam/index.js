import { ROUTES } from '@/legasy/ROUTES'
import { AddIcon } from '@/legasy/src/utils/Icons'
import router from 'next/router'
import Button from '../Button'

export default function ButtonNewTeam() {
  return (
    <div className="flex w-1/2 mx-auto py-2 justify-center">
      <Button
        onClick={() => router.push(ROUTES.teams.new())}
        size="xs"
        fullWidth
      >
        Nuevo equipo
        <AddIcon size="2rem" />
      </Button>
    </div>
  )
}
