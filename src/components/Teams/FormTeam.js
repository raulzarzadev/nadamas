import { updateTeam } from '@/firebase/teams'
import { useAuth } from '@/src/context/AuthContext'
import Button from '@comps/inputs/Button'
import Text from '@comps/inputs/Text'
import { useEffect, useState } from 'react'
import { ROUTES } from '@/pages/ROUTES'
import { useRouter } from 'next/router'
import Toggle from '@comps/inputs/Toggle'
import Info from '@comps/Alerts/Info'

import TextEditable from '@comps/inputs/TextEditable'

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
    setDirty(true)
  }

  const handleSubmit = () => {
    updateTeam({ ...form }).then(({ id }) => {
      router.push(ROUTES.teams.details(id))
      setDirty(false)
    })
  }

  const handleSetPublicTeam = ({ target }) => {
    setForm({ ...form, [target.name]: target.checked })
    setDirty(true)
  }
  const [dirty, setDirty] = useState(false)

  return (
    <div className="relative max-w-lg mx-auto">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSubmit()
        }}
      >
        {dirty && (
          <div className="sticky top-0 flex p-2 justify-end bg-gray-700">
            <div className="w-1/2">
              <Button size="sm ">Guardar</Button>
            </div>
          </div>
        )}
        <h3 className="text-center pt-2">
          {teamAlreadyExist ? 'Equipo' : 'Nuevo equipo'}
        </h3>
        <div className="flex justify-center items-center">
          <TextEditable
            value={form?.title}
            name="title"
            onChange={handleChange}
            // label="Nombre del equipo"
          />
        </div>
        <div className="p-2 text-sm">
          <Toggle
            size="sm"
            label={form.publicTeam ? 'Público' : 'Privado'}
            name="publicTeam"
            onChange={handleSetPublicTeam}
            checked={form?.publicTeam}
          />
          {form.publicTeam && (
            <Info
              text={`Si es público, otras personas podrán verlo, sabrán 
                      la cantidad de miembros y el nombre del entrenador.  
                      También podrán solicitar unirse en cualquier momento
                      `}
            />
          )}
        </div>
        
      </form>
    </div>
  )
}
