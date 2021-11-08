import { getAthlete, getAthleteId, updateAtlete } from '@/firebase/athletes'
import { updateUser } from '@/firebase/client'
import { useAuth } from '@/src/context/AuthContext'
import Loading from '@comps/Loading'
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

  const [form, setForm] = useState({
    birth: new Date(),
    records: []
  })

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

  if (!user || !form) return <Loading />
  const isAthleteOwner = form?.userId === user.id
  return (
    <Form
      form={form}
      setForm={setForm}
      handleSubmit={handleSubmit}
      isEditable={isAthleteOwner}
    />
  )
}
