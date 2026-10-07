'use client'
import { usePathname, useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useUser } from '@/context/UserContext'
import { enableCoach as enableCoachFb } from '@/firebase/users'
import { destinationForRole } from '@/lib/role-destination'
import {
  ACTIVE_ROLE_STORAGE_KEY,
  normalizeRoles,
  type RoleName,
  type Roles,
  resolveActiveRole,
} from '@/lib/roles'

interface RoleContextValue {
  roles: Roles
  activeRole: RoleName
  activeRolePreferenceReady: boolean
  hasActiveRolePreference: boolean
  isAdmin: boolean
  setActiveRole: (role: RoleName, options?: { navigate?: boolean }) => void
  enableCoach: () => Promise<void>
}

interface AuthUser {
  uid?: string
  id?: string
  roles?: Partial<Roles> | null
  isCoach?: boolean | null
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined)

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const { user, refreshUser } = useUser() as {
    user: AuthUser | null | undefined
    refreshUser: () => Promise<AuthUser | null>
  }
  const router = useRouter()
  const pathname = usePathname()
  const roles = useMemo(() => normalizeRoles(user), [user])

  const [stored, setStored] = useState<string | null>(null)
  const [activeRolePreferenceReady, setActiveRolePreferenceReady] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') {
      setActiveRolePreferenceReady(true)
      return
    }
    setStored(localStorage.getItem(ACTIVE_ROLE_STORAGE_KEY))
    setActiveRolePreferenceReady(true)
  }, [])

  const activeRole = useMemo(() => resolveActiveRole(stored, roles), [stored, roles])
  const hasActiveRolePreference = stored === activeRole

  const setActiveRole = useCallback(
    (role: RoleName, options?: { navigate?: boolean }) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(ACTIVE_ROLE_STORAGE_KEY, role)
      }
      setStored(role)
      const destination = destinationForRole(role)
      if (options?.navigate !== false && pathname !== destination) router.push(destination)
    },
    [pathname, router]
  )

  const enableCoach = useCallback(async () => {
    const id = user?.uid || user?.id
    if (!id) return
    await enableCoachFb(id)
    await refreshUser()
  }, [user, refreshUser])

  const value = useMemo(
    () => ({
      roles,
      activeRole,
      activeRolePreferenceReady,
      hasActiveRolePreference,
      isAdmin: roles.admin,
      setActiveRole,
      enableCoach,
    }),
    [
      roles,
      activeRole,
      activeRolePreferenceReady,
      hasActiveRolePreference,
      setActiveRole,
      enableCoach,
    ]
  )

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}

export const useRole = (): RoleContextValue => {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error('useRole must be used within RoleProvider')
  return ctx
}
