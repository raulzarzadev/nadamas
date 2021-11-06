import { createContext, useContext, useEffect, useState } from 'react'
import {
  firebaseLogout,
  loginWithGoogle,
  onAuthStateChanged
} from '@/firebase/client'
import { getSchedules } from '@/firebase/schedules'
import { useRouter } from 'next/router'
const AuthContext = createContext()

export function AuthProvider({ children }) {
  const router = useRouter()
  const [user, setUser] = useState()

  const ENVIROMENT = process.env.NEXT_PUBLIC_ENVIROMENT
  console.log('ENVIROMENT', ENVIROMENT)

  useEffect(() => {
    if (ENVIROMENT === 'DEV') {
      setUser({
        email: 'raul3arza@gmail.com',
        id: 'osdRhDFpycZCa2e6o7QdEsDRbzw2',
        image: '',
        joinedAt: 324234,
        name: 'Zarza Dev'
      })
    } else if (!user) {
      onAuthStateChanged(setUser)
    }
  }, [])

  /*   
  const [userSchedule, setUserSchedule] = useState({})
  useEffect(() => {
    if (user) {
      getSchedules(user?.id)
        .then(( res ) => {
          console.log(`res`, res)
          setUserSchedule(res[0].schedule)})
        .catch((err) => console.log('err', err))
    }
  }, [user]) */

  // confirm if user have isActive

  const signOut = () => {
    firebaseLogout()
  }

  const googleLogin = async () => {
    loginWithGoogle()
      .then(({ user }) => {
        // console.log('user', user)
        router.reload()
        setUser(user)
      })
      .catch((err) => {
        console.log('err', err)
      })
  }

  return (
    <AuthContext.Provider value={{ user, googleLogin, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  return useContext(AuthContext)
}
