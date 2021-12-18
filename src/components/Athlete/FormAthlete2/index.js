import { getAthleteId, updateAtlete } from '@/firebase/athletes'
import { updateUser } from '@/firebase/client'
import { useAuth } from '@/src/context/AuthContext'
import useEditable from '@/src/hooks/useEditable'
import { format } from '@/src/utils/Dates'
import Button from '@comps/inputs/Button'
import Loading from '@comps/Loading'
import ContentNotAvailable from '@comps/MainLayout/PageErrors/ContentNotAvailable'
import Modal from '@comps/Modals/Modal'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import SectionPersonal from '../FormAthlete/SectionPersonal'

export default function FormAthlete({ athleteId = '' }) {
  const { user } = useAuth()

  const router = useRouter()
  const { configSwimmer } = router.query

  useEffect(() => {
    if (athleteId) {
      getAthleteId(athleteId)
        .then((res) => {
          setForm(res)
        })
        .catch((err) => console.log(`err`, err))
    } else {
      setForm(null)
    }
  }, [])

  const [form, setForm] = useState(undefined)

  const handleSubmit = async () => {
    updateAtlete({ ...form, active: true, userId: user.id })
      .then(({ res }) => {
        if (configSwimmer) {
          updateUser({ id: user?.id, athleteId: res?.id })
            .then((res) => {
              router.back()
            })
            .catch((err) => console.log(`err`, err))
        } else {
          if (res) {
            //console.log(`res`, res)
            router.push(`/athletes/${res?.id}`)
          }
        }
      })
      .catch((err) => console.log(`err`, err))
  }

  const { isOwner, isThemCoach } = useEditable({
    userId: form?.userId,
    coachId: form?.coachId
  })

  const [openAthleteForm, setOpenAthleteForm] = useState()
  const handleOpenAthleteForm = () => {
    setOpenAthleteForm(!openAthleteForm)
  }

  if (!user || form === undefined) return <Loading />
  // ni no es dueño ni entrenador no puede ver el contedio
  // si no es nueño no puede editar
  if (!isOwner && !user?.coach) return <ContentNotAvailable />
  return (
    <div className="m-2">
      <Info ahtlete={form} />
      <div className="flex flex-col justify-center items-center">
        <Button
          variant="success"
          label="editar perfil"
          noWrapText
          onClick={handleOpenAthleteForm}
        />
      </div>
      <Modal
        open={openAthleteForm}
        handleOpen={handleOpenAthleteForm}
        title="Editar atleta"
      >
        <SectionPersonal
          handleSave={handleSubmit}
          form={form}
          setForm={setForm}
          isEditable={true}
        />
      </Modal>
    </div>
  )
}

const Info = ({
  ahtlete: { name, email, birth, goals, blodType, mobile, lastName }
}) => {
  return (
    <div className=" flex flex-col justify-center items-center">
      <div>
        {name} {lastName}
      </div>
      <div>{email}</div>
      <div>{format(birth, 'dd MMM yy')}</div>
      <div>{mobile}</div>
      <div>{blodType}</div>
    </div>
  )
}
