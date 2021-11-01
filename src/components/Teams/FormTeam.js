import { updateTeam } from '@/firebase/teams'
import { useAuth } from '@/src/context/AuthContext'
import Button from '@comps/inputs/Button'
import Text from '@comps/inputs/Text'
import { useEffect, useState } from 'react'
import { ROUTES } from '@/pages/ROUTES'
import { useRouter } from 'next/router'
import Toggle from '@comps/inputs/Toggle'
import Info from '@comps/Alerts/Info'

export default function FormTeam({ team = null }) {
  const { user } = useAuth()
  const router = useRouter()

  const [form, setForm] = useState({
    athletes: []
  })

  const teamAlreadyExist = !!form?.id

  useEffect(() => {
    if (team) {
      setForm(team)
    } else {
      setForm({
        ...form,
        userId: user?.id,
        coach: {
          id: user?.id,
          name: `${user?.name || ''} ${user?.lastName || ''}`
        }
      })
    }
  }, [user, team])
  const handleChange = ({ target }) => {
    setForm({ ...form, [target.name]: target.value })
  }

  const handleSubmit = () => {
    updateTeam({ ...form }).then(({ id }) => {
      router.push(ROUTES.teams.details(id))
    })
  }

  const handleSetPublicTeam = ({ target }) => {
    setForm({ ...form, [target.name]: target.checked })
  }

  return (
    <div className="relative max-w-lg mx-auto">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSubmit()
        }}
      >
        <div className="sticky top-0 flex p-2 justify-end bg-gray-700">
          <div className="w-1/2">
            <Button size="sm ">
              {' '}
              {teamAlreadyExist ? 'Guardar cambios' : 'Guardar'}
            </Button>
          </div>
        </div>
        <h3 className="text-center p-2 text-xl">
          {teamAlreadyExist ? 'Equipo' : 'Nuevo equipo'}
        </h3>
        <div className="p-2">
          <Toggle
            label="Equipo público"
            name="publicTeam"
            onChange={handleSetPublicTeam}
            checked={form?.publicTeam}
          />
          <Info text="Si el quipo es publico cualquiera podra buscarlo y enviar solicitudes" />
        </div>
        <div className="p-2">
          <Text
            value={form?.title}
            name="title"
            onChange={handleChange}
            label="Nombre del equipo"
          />
        </div>
      </form>
    </div>
  )
}
