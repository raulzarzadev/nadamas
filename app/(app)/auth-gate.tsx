'use client'
import Loading from '@comps/Loading'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useUser } from '@/context/UserContext'

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user } = useUser() as { user: unknown }
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (user === null) {
      const target = pathname ? `/login?redirectTo=${encodeURIComponent(pathname)}` : '/login'
      router.replace(target)
    }
  }, [user, pathname, router])

  if (user === undefined) return <Loading size="lg" fullScreen />
  if (user === null) return <Loading size="lg" fullScreen />
  return <>{children}</>
}
