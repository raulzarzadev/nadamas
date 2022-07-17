import { createContext, useContext, useEffect, useState } from 'react'

import Loading from '@/components/Loading'
import { authStateChanged, googleLogin, logOut } from '@/firebase'
import { useRouter } from 'next/router'
import { loginUser } from '@/firebase/users'
const UserContext = createContext()

export function UserProvider({ children }) {
  const [user, setUser] = useState(undefined)
  const router = useRouter()
  const { redirectTo } = router?.query

  useEffect(() => {
    authStateChanged((res) => {
      res ? setUser(res) : setUser(null)
    })
  }, [])

  const logout = () => {
    logOut()
  }


  const login = async (provider = 'google') => {
    if (provider === 'google')
      return googleLogin()
        .then((user) => {
          loginUser(user)
            .then((res) => {
              setUser(res)
              // console.log('login', res)
              redirectTo ? router.push(redirectTo) : router.push('/profile')

            })
            .catch((err) => {
              console.error(err)
            })
        })
        .catch((err) => console.log(`err`, err))
  }

  useEffect(() => {
    if (user && router.pathname==='/') router.push('/profile')
  }, [user])

  
  if (user === undefined) return <Loading />
  


  return (
    <UserContext.Provider value={{ user, login, logout }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => {
  return useContext(UserContext)
}
