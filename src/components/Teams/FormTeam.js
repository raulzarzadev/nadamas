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
import { AddIcon, EditIcon, TrashBinIcon } from '@/src/utils/Icons'
import Modal from '@comps/Modals/Modal'
import AthleteRow from '@comps/AthleteRow'

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

  const handleAddAthlete = (athlete) => {
    setForm({ ...form, athletes: [...form?.athletes, athlete.id] })
  }
  const handleChange = ({ target }) => {
    setForm({ ...form, [target.name]: target.value })
  }

  const handleSubmit = () => {
    updateTeam({ ...form }).then(({ id }) => {
      router.push(ROUTES.teams.details(id))
    })
  }

  const [openDelete, setOpenDelete] = useState(false)
  const handleOpenDelete = () => {
    setOpenDelete(!openDelete)
  }
  const handleDelete = (athleteId) => {
    const newAthleteList = form.athletes.filter((id) => id !== athleteId)
    setForm({ ...form, athletes: newAthleteList })
    // updateTeam({ ...form, athletes: newAthleteList })
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

  const [openSearchModal, setOpenSearchModal] = useState(false)
  const handleOpenSearch = () => {
    setOpenSearchModal(!openSearchModal)
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
          <Text
            value={form?.title}
            name="title"
            onChange={handleChange}
            label="Nombre del equipo"
          />
        </div>
      </form>
      <div className="flex justify-center items-center">
        <h4 className="p-2 text-center font-bold">Integrantes </h4>
        <Button iconOnly size="xs" onClick={handleOpenSearch}>
          <AddIcon />
        </Button>
      </div>

      <Modal
        open={openSearchModal}
        handleOpen={handleOpenSearch}
        title="Nuevo integrante"
      >
        <SearchAthletes
          AthleteRowResponse={AthleteResponse}
          setAthlete={(athlete) => {
            handleAddAthlete(athlete)
            setTimeout(() => {
              handleOpenSearch()
            }, 400)
          }}
          label="Agregar atleta"
        />
      </Modal>
      <div className="p-2 max-w-md mx-auto">
        {athleteList?.map((athlete, i) => (
          <div key={athlete.id} className="flex items-center w-full">
            <Button
              variant="danger"
              className="ml-2 py-1"
              onClick={handleOpenDelete}
              iconOnly
              size="xs"
            >
              <TrashBinIcon size="1rem" />
            </Button>
            <AthleteRow athlete={athlete} />
            <DeleteModal
              text="Descartar atleta del equipo."
              title="Descartar atleta"
              open={openDelete}
              handleOpen={handleOpenDelete}
              name={`${athlete?.name} ${athlete?.lastName}`}
              handleDelete={() => {
                handleDelete(athlete.id)
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
/* 
<div key={i} className="px-2 flex items-center my-3">
            <div className="grid grid-flow-col gap-4">
              <Button
                className="ml-2 py-1"
                onClick={() => handleRedirectAthlete(id)}
                iconOnly
                size="xs"
              >
                <EditIcon size="1rem" />
              </Button>
             
            </div>
            <div className="mx-2">{name}</div>
            
          </div> */
