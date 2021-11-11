import { createContext, useContext, useEffect, useState } from 'react'
import {
  firebaseLogout,
  loginWithGoogle,
  onAuthStateChanged
} from '@/firebase/client'
import { useRouter } from 'next/router'
import Loading from '@comps/Loading'
const AuthContext = createContext()

export function AuthProvider({ children }) {
  const router = useRouter()
  const [user, setUser] = useState(undefined)

  useEffect(() => {
    onAuthStateChanged(setUser)
  }, [])

  const signOut = () => {
    firebaseLogout()
  }

  const googleLogin = async () => {
    loginWithGoogle()
      .then(({ user }) => {
        // console.log('user', user)
        //router.replace('/profile')
        //router.push('/profile')
        // router.replace('/profile')
        router.reload()
        setUser(user)
      })
      .catch((err) => {
        console.log('err', err)
      })
  }
  if (user === undefined) return <Loading />

  return (
    <AuthContext.Provider value={{ user, googleLogin, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  return useContext(AuthContext)
}
