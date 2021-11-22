import { getAthlete, getAthleteId, updateAtlete } from '@/firebase/athletes'
import { updateUser } from '@/firebase/client'
import { useAuth } from '@/src/context/AuthContext'
import useEditable from '@/src/hooks/useEditable'
import Loading from '@comps/Loading'
import ContentNotAvailable from '@comps/MainLayout/PageErrors/ContentNotAvailable'
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

  if (!user || form === undefined) return <Loading />
  // ni no es dueño ni entrenador no puede ver el contedio
  // si no es nueño no puede editar
  if (!isOwner && !user?.coach) return <ContentNotAvailable />
  return (
    <div>
      <SectionPersonal handleSave={handleSubmit} form={form} setForm={setForm} isEditable={true} />
    </div>
  )
}
