import { getAthlete, updateAtlete } from '@/firebase/athletes'
import { useAuth } from '@/src/context/AuthContext'
import Loading from '@comps/Loading'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { Form } from './Form2'

export default function FormAthlete({ athleteId = '' }) {
  const { user } = useAuth()
  /* 
  // const [isEditable, setisEditable] = useState(true)
  useEffect(() => {
    const isTheCoach = user?.id === form?.userId
    const isOwner = user?.athleteId === athleteId
    // setisEditable(isTheCoach || isOwner || !alreadyExist)
  }, [user]) */

  const router = useRouter()
  const { configSwimmer } = router.query

  useEffect(() => {
    if (athleteId) {
      getAthlete(athleteId)
        .then((res) => {
          console.log(`res`, res)
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
    const res = await updateAtlete({ ...form, active: true, userId: user.id })
    console.log(`res`, res)
    if (res?.type === 'ATHLETE_CREATED') {
      if (configSwimmer) {
        const updateSwimmer = await updateUser({
          id: user.id,
          athleteId: res?.id
        })
        console.log(`updateSwimmer`, updateSwimmer)
        router.back()
      } else {
        router.push(`/athletes/${res?.id}`)
      }
    }
  }

  if (!user) return <Loading />
  return (
    <Form
      form={form}
      setForm={setForm}
      handleSubmit={handleSubmit}
    />
  )
}
