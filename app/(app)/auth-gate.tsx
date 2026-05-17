'use client'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useUser } from '@/context/UserContext'
import Loading from '@comps/Loading'

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user } = useUser() as { user: unknown }
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (user === null) {
      const target = pathname
        ? `/login?redirectTo=${encodeURIComponent(pathname)}`
        : '/login'
      router.replace(target)
    }
  }, [user, pathname, router])

  if (user === undefined) return <Loading />
  if (user === null) return <Loading />
  return <>{children}</>
}
