import { getAthlete, getAthleteId, updateAtlete } from '@/firebase/athletes'
import { updateUser } from '@/firebase/client'
import { useAuth } from '@/src/context/AuthContext'
import useEditable from '@/src/hooks/useEditable'
import Loading from '@comps/Loading'
import ContentNotAvailable from '@comps/PageErrors/ContentNotAvailable'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { Form } from './Form2'

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
    }
  }, [])

  const [form, setForm] = useState(undefined)

  const handleSubmit = async () => {
    updateAtlete({ ...form, active: true, userId: user.id })
      .then(({ res }) => {
        console.log(`res`, res)
        if (configSwimmer) {
          updateUser({ id: user?.id, athleteId: res?.id })
            .then((res) => {
              router.back()
              console.log(`res`, res)
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

  const { isOwner, isCoach } = useEditable({
    athleteId: form?.id,
    coachId: form?.coachId
  })

  if (!user || !form) return <Loading />
  if (!isOwner || !isCoach) return <ContentNotAvailable />
  return (
    <Form
      form={form}
      setForm={setForm}
      handleSubmit={handleSubmit}
      isEditable={isOwner || isCoach}
    />
  )
}
