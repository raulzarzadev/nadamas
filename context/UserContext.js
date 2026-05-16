'use client'
import { createContext, useContext, useEffect, useState } from 'react'

import Loading from '@/components/Loading'
import { authStateChanged, googleLogin, logOut } from '@/firebase'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { loginUser } from '@/firebase/users'
const UserContext = createContext()

export function UserProvider({ children }) {
  const [user, setUser] = useState(undefined)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const redirectTo = searchParams?.get('redirectTo')

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
              redirectTo ? router.push(redirectTo) : router.push('/profile')

            })
            .catch((err) => {
              console.error(err)
            })
        })
        .catch((err) => console.log(`err`, err))
  }

  useEffect(() => {
    /**
    * Redirect user if is comming from other page then after login turn it back
    * if user is logged redirect to profile
    */
    if (user && redirectTo) {
      router.push(redirectTo)
    }
    else if (user && pathname === '/') {
      router.push('/profile')
    }
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
