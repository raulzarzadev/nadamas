import { updateAtlete } from "@/firebase/athletes"
import { updateUser } from "@/firebase/client"
import { useAuth } from "@/src/context/AuthContext"
import useAthlete from "@/src/hooks/useAthlete"
import useEditable from "@/src/hooks/useEditable"
import ButtonSave from "@comps/inputs/ButtonSave"
import Loading from "@comps/Loading"
import ContentNotAvailable from "@comps/MainLayout/PageErrors/ContentNotAvailable"
import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import SectionContact from "./SectionContact"
import SectionEmergency from "./SectionEmergency"
import SectionMedic from "./SectionMedic"
import SectionPersonal from "./SectionPersonal"

export default function FormAthlete ({ athleteId }) {
  const { user } = useAuth()

  const router = useRouter()
  const { configSwimmer } = router.query
  const { athlete } = useAthlete(athleteId)

  useEffect(() => {
    if (athlete) {
      setForm(athlete)
    } else {
      setForm(null)
    }
  }, [athlete])
  const [form, setForm] = useState(undefined)

  const handleSubmit = async () => {
    updateAtlete({ ...form, active: true, userId: user.id })
      .then(({ res }) => {
        setButtonStatus('saved')

        setTimeout(() => {
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
        }, 400)

      })
      .catch((err) => console.log(`err`, err))
  }
  // TODO falla cuando el ususario no tiene userId
  const { isOwner, isThemCoach } = useEditable({
    userId: form?.userId,
    coachId: form?.coachId
  })

  const handleSetForm = (newForm) => {
    setButtonStatus('dirty')
    setForm(newForm)
  }

  console.log(`form`, form)



  const [buttonStatus, setButtonStatus] = useState('clean')


  if (!user || form === undefined) return <Loading />
  // ni no es dueño ni entrenador no puede ver el contedio
  // si no es nueño no puede editar

  if (!isOwner && !user?.coach) return <ContentNotAvailable />
  return (
    <div className=''>
      <div className='flex justify-center'>
        <ButtonSave
          onClick={ () => {
            handleSubmit()
            setButtonStatus('saved')
          } }
          status={ buttonStatus }
        />
      </div>
      {/* ----------------------------------------------Personal Information */ }
      <SectionPersonal form={ form } setForm={ handleSetForm } />
      {/* ----------------------------------------------Contact */ }
      <SectionContact form={ form } setForm={ handleSetForm } />
      {/* ----------------------------------------------Medic information */ }
      <SectionMedic form={ form } setForm={ handleSetForm } />

      {/* ----------------------------------------------Emergency contact */ }
      <SectionEmergency form={ form } setForm={ handleSetForm } />
    </div>
  )
}