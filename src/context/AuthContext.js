import { createContext, useContext, useEffect, useState } from 'react'
import {
  firebaseLogout,
  loginWithGoogle,
  onAuthStateChanged
} from '@/firebase/client'
const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState()
  useEffect(() => {
    if (!user) {
      onAuthStateChanged(setUser)
    }
  }, [])

  // confirm if user have isActive

  const signOut = () => {
    firebaseLogout()
  }

  const googleLogin = async () => {
    loginWithGoogle()
      .then(({ user }) => {
        console.log('user', user)

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
