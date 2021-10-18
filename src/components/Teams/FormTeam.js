import { updateTeam } from '@/firebase/teams'
import { useAuth } from '@/src/context/AuthContext'
import Button from '@comps/inputs/Button'
import SearchAthletes from '@comps/inputs/SearchAthletes'
import Text from '@comps/inputs/Text'
import DeleteModal from '@comps/Modals/DeleteModal'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { getAthlete } from '@/firebase/athletes'
import { ROUTES } from '@/pages/ROUTES'
import { useRouter } from 'next/router'

export default function FormTeam({ team = undefined }) {
  const { user } = useAuth()
  const router = useRouter()
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
  const [form, setForm] = useState({
    athletes: []
  })

  const handleClickAthlete = (athlete) => {
    setForm({ ...form, athletes: [...form?.athletes, athlete.id] })
  }
  const handleChange = ({ target }) => {
    setForm({ ...form, [target.name]: target.value })
  }

  const handleSubmit = () => {
    updateTeam({ ...form }).then(({ id }) => {
      router.push(ROUTES.teams.details(id))
    })
    //
  }

  const [openDelete, setOpenDelete] = useState(false)
  const handleOpenDelete = () => {
    setOpenDelete(!openDelete)
  }
  const handleDelete = (athleteId) => {
    const newAthleteList = form.athletes.filter((id) => id !== athleteId)
    setForm({ ...form, athletes: newAthleteList })
    updateTeam({ ...form, athletes: newAthleteList })
  }

  const [athleteList, setAthleteList] = useState([])
  useEffect(() => {
    const list = form?.athletes?.map((athleteId) => {
      return getAthlete(athleteId)
    })

    Promise?.all(list).then((res) => {
      setAthleteList(res)
    })
  }, [form.athletes])

  

  return (
    <div className="relative">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSubmit()
        }}
      >
        <div className="sticky top-0 flex p-2 justify-end bg-gray-700">
          <div className="w-1/2">
            <Button>Guardar</Button>
          </div>
        </div>
        <h3 className="text-center p-2 text-xl">Nuevo equipo</h3>
        <div className="p-2">
          <Text
            value={form?.title}
            name="title"
            onChange={handleChange}
            label="Nombre del equipo"
          />
        </div>
        <div className="p-2">
          <SearchAthletes
            AthleteRowResponse={AthleteResponse}
            setAthlete={handleClickAthlete}
            label="Agregar atleta"
          />
        </div>
      </form>
      <div className="p-2">
        {athleteList?.map(({ id, name, lastName }, i) => (
          <div key={i} className="px-2 flex">
            <div className="mx-2" onClick={handleOpenDelete}>
              x
            </div>
            <div className="mx-2">{name}</div>
            <DeleteModal
              open={openDelete}
              handleOpen={handleOpenDelete}
              name={`${name} ${lastName}`}
              handleDelete={() => {
                handleDelete(id)
                handleOpenDelete()
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

const AthleteResponse = ({ athlete, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="my-2"
    >{`${athlete.name} ${athlete.lastName}`}</div>
  )
}
