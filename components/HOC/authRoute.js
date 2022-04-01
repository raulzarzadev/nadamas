import { useUser } from '@/context/UserContext'
import Loading from '@comps/Loading'
import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'

const authRoute = (Component) => {
  const Auth = (props) => {
    const router = useRouter()

    const { user } = useUser()

    const [NewComponent, setNewComponent] = useState(<Loading />)

    useEffect(() => {
      user
        ? setNewComponent(<Component {...props} />)
        : router.push(`/login?redirectTo=${router.pathname}`)
    }, [user])

    return NewComponent
  }
  return Auth
}

export default authRoute
