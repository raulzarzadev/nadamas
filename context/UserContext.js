import { createContext, useContext, useEffect, useState } from 'react'

import Loading from '@/components/Loading'
import { authStateChanged, googleLogin, logOut } from '@/firebase'
const UserContext = createContext()

export function UserProvider({ children }) {
  const [user, setUser] = useState(undefined)

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
        .then((res) => console.log(`logged`))
        .catch((err) => console.log(`err`, err))
  }

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
