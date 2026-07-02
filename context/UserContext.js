'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { usePostHog } from 'posthog-js/react'
import { createContext, useContext, useEffect, useState } from 'react'
import { authStateChanged, googleLogin, logOut } from '@/firebase/index'
import { getUser, loginUser } from '@/firebase/users'
import { destinationForRole, entryRoleForSession } from '@/lib/role-destination'
import { normalizeRoles } from '@/lib/roles'

const UserContext = createContext()

export function UserProvider({ children }) {
  const [user, setUser] = useState(undefined)
  const router = useRouter()
  const posthog = usePostHog()
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

  const refreshUser = async () => {
    const id = user?.uid || user?.id
    if (!id) return null
    const freshUser = await getUser(id)
    setUser(freshUser)
    return freshUser
  }

  const login = async (provider = 'google') => {
    if (provider === 'google') {
      posthog?.capture('login_attempt', { provider })
      return googleLogin()
        .then((user) => {
          if (!user) return
          loginUser(user)
            .then((res) => {
              setUser(res)
              posthog?.capture('login_success', { provider })
              redirectTo
                ? router.push(redirectTo)
                : router.push(destinationForRole(entryRoleForSession(normalizeRoles(res))))
            })
            .catch((err) => {
              console.error(err)
              posthog?.capture('login_failed', { provider, stage: 'loginUser', error: String(err) })
            })
        })
        .catch((err) => {
          console.log(`err`, err)
          posthog?.capture('login_failed', { provider, stage: 'googleLogin', error: String(err) })
        })
    }
  }

  useEffect(() => {
    if (!posthog) return
    if (user) {
      posthog.identify(user.uid || user.id, {
        email: user.email,
        name: user.displayName || user.name,
      })
    } else if (user === null) {
      posthog.reset()
    }
  }, [user, posthog])

  useEffect(() => {
    /**
     * Redirect user if is comming from other page then after login turn it back
     * if user is logged redirect to profile
     */
    if (user && redirectTo) {
      router.push(redirectTo)
    }
  }, [user, router, redirectTo])

  return (
    <UserContext.Provider value={{ user, login, logout, refreshUser }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => {
  return useContext(UserContext)
}
