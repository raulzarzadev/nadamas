import { updateTeam } from '@/legasy/firebase/teams'
import { useAuth } from '@/legasy/src/context/AuthContext'
import Button from '@/legasy/src/components/inputs/Button'
import Text from '@/legasy/src/components/inputs/Text'
import { useEffect, useState } from 'react'
import { ROUTES } from '@/legasy/ROUTES'

import { useRouter } from 'next/router'
import Toggle from '@/legasy/src/components/inputs/Toggle'
import Info from '@/legasy/src/components/Alerts/Info'

import TextEditable from '@/legasy/src/components/inputs/TextEditable'

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
          <div className="flex justify-center p-2">
              <Button size="lg">Guardar</Button>
          </div>
        )}
        <div className="flex justify-center items-center">
          <TextEditable
            value={form?.title}
            name="title"
            onChange={handleChange}
            label={teamAlreadyExist ? 'Equipo' : 'Nuevo equipo'}
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
        </div>
      </form>
    </div>
  )
}
