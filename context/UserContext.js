'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { usePostHog } from 'posthog-js/react'
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { auth, authStateChanged, googleLogin, logOut } from '@/firebase/index'
import { getUser, loginUser } from '@/firebase/users'
import { analyticsEnabled, trackEvent } from '@/lib/analytics/client'
import { destinationForRole, entryRoleForSession } from '@/lib/role-destination'
import { normalizeRoles } from '@/lib/roles'
import { reportInternalError } from '@/lib/user-facing-error'

const UserContext = createContext()

export function UserProvider({ children }) {
  const [user, setUser] = useState(undefined)
  const router = useRouter()
  const posthog = usePostHog()
  const analyticsUser = useRef(null)
  const searchParams = useSearchParams()
  const redirectTo = searchParams?.get('redirectTo')

  useEffect(() => {
    let active = true
    const unsubscribe = authStateChanged((res) => {
      if (active) setUser(res || null)
    })
    return () => {
      active = false
      unsubscribe?.()
    }
  }, [])

  // Allocate permanent IDs for every signed-in user, including existing accounts.
  useEffect(() => {
    if (!user || !auth.currentUser) return
    void auth.currentUser
      .getIdToken()
      .then((token) => fetch('/api/credentials', { headers: { Authorization: `Bearer ${token}` } }))
      .catch(() => {})
  }, [user])

  const logout = () => {
    trackEvent('logout')
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
      trackEvent('login_attempt', { provider })
      return googleLogin()
        .then((user) => {
          if (!user) return
          loginUser(user)
            .then((res) => {
              setUser(res)
              trackEvent('login_success', { provider })
              redirectTo
                ? router.push(redirectTo)
                : router.push(destinationForRole(entryRoleForSession(normalizeRoles(res))))
            })
            .catch((err) => {
              reportInternalError('AUTH_PROFILE', err)
              trackEvent('login_failed', { provider, stage: 'profile' })
            })
        })
        .catch((err) => {
          reportInternalError('AUTH_GOOGLE', err)
          trackEvent('login_failed', { provider, stage: 'provider' })
        })
    }
  }

  useEffect(() => {
    if (!posthog || !analyticsEnabled()) return
    if (user) {
      const id = user.uid || user.id
      posthog.identify(id, {
        is_coach: normalizeRoles(user).coach,
        is_admin: normalizeRoles(user).admin,
      })
      if (analyticsUser.current !== id) {
        analyticsUser.current = id
        trackEvent('auth_session_started')
      }
    } else if (user === null) {
      analyticsUser.current = null
      posthog.reset()
    }
  }, [user, posthog])

  return (
    <UserContext.Provider value={{ user, login, logout, refreshUser }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => {
  return useContext(UserContext)
}
