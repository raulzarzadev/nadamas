import { createContext, useContext, useEffect, useState } from 'react'
import {
  firebaseLogout,
  loginWithGoogle,
  onAuthStateChanged
} from '@/firebase/client'
import { useRouter } from 'next/router'
const AuthContext = createContext()

export function AuthProvider({ children }) {
  const router = useRouter()
  const [user, setUser] = useState()

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
        router.replace('/profile')
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
