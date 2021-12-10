import Button from '@comps/inputs/Button'
import AthleteRow from '../AthleteRow'
import { AddPersonIcon } from '../../utils/Icons'
import { useRouter } from 'next/router'
import SearchAthletes from '@comps/inputs/SearchAthletes'

export default function Athletes() {
  const router = useRouter()
  return (
    <div className="max-w-xl mx-auto">
      <h3 className="text-center font-bold text-lg">Todos los atletas</h3>
      {/* LISTA DE ATLETAS */}
      <div className="flex justify-center">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => router.push('/athletes/new')}
        >
          <div className="truncate ">Nuevo Atleta</div>
          <AddPersonIcon />
        </Button>
      </div>

      <div className="px-1 mx-auto my-4">
        <SearchAthletes AthleteRowResponse={AthleteRow} />
      </div>
    </div>
  )
}
