'use client'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/context/UserContext'
import { enableCoach as enableCoachFb } from '@/firebase/users'
import {
  ACTIVE_ROLE_STORAGE_KEY,
  normalizeRoles,
  resolveActiveRole,
  type RoleName,
  type Roles,
} from '@/lib/roles'

interface RoleContextValue {
  roles: Roles
  activeRole: RoleName
  isAdmin: boolean
  setActiveRole: (role: RoleName) => void
  enableCoach: () => Promise<void>
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined)

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser() as { user: any }
  const router = useRouter()
  const roles = useMemo(() => normalizeRoles(user), [user])

  const [stored, setStored] = useState<string | null>(null)
  useEffect(() => {
    if (typeof window === 'undefined') return
    setStored(localStorage.getItem(ACTIVE_ROLE_STORAGE_KEY))
  }, [])

  const activeRole = useMemo(
    () => resolveActiveRole(stored, roles),
    [stored, roles]
  )

  const setActiveRole = useCallback(
    (role: RoleName) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(ACTIVE_ROLE_STORAGE_KEY, role)
      }
      setStored(role)
      router.push(`/${role}/home`)
    },
    [router]
  )

  const enableCoach = useCallback(async () => {
    const id = user?.uid || user?.id
    if (!id) return
    await enableCoachFb(id)
  }, [user])

  const value = useMemo(
    () => ({
      roles,
      activeRole,
      isAdmin: roles.admin,
      setActiveRole,
      enableCoach,
    }),
    [roles, activeRole, setActiveRole, enableCoach]
  )

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}

export const useRole = (): RoleContextValue => {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error('useRole must be used within RoleProvider')
  return ctx
}
