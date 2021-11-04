import { ROUTES } from '@/ROUTES'
import { useRouter } from 'next/router'

export default function SelectGroupsView() {
  const { push, route } = useRouter()


  return (
    <div className="">
      <div className="py-2 flex justify-evenly">
        <div className=" w-1/2 text-center px-2">
          <button
            className={`${
              route === ROUTES.groups.index && 'bg-green-600'
            } w-full `}
            onClick={() => push(ROUTES.groups.index)}
          >
            Horarios
          </button>
        </div>
        <div className=" w-1/2 text-center px-2">
          <button
            className={`${
              route === ROUTES.teams.index && 'bg-green-600'
            } w-full `}
            onClick={() => push(ROUTES.teams.index)}
          >
            Equipos
          </button>
        </div>
      </div>
    </div>
  )
}
