'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@/context/UserContext'
import { useRole } from '@/context/RoleContext'
import AuthCard from '@comps/AuthCard'
import Loading from '@comps/Loading'

function AuthCardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-[2rem] border border-[var(--c-border)] bg-white shadow-[var(--shadow-md)]">
      <div className="space-y-3 bg-[var(--c-surface)] px-5 py-6 sm:px-7">
        <div className="mx-auto h-11 w-36 animate-pulse rounded-full bg-white" />
        <div className="h-8 w-52 animate-pulse rounded-full bg-white" />
        <div className="h-4 w-full animate-pulse rounded-full bg-white" />
        <div className="h-4 w-4/5 animate-pulse rounded-full bg-white" />
      </div>
      <div className="space-y-4 px-5 py-6 sm:px-7">
        <div className="h-28 animate-pulse rounded-2xl bg-[var(--c-surface)]" />
        <div className="h-12 animate-pulse rounded-2xl bg-[var(--c-surface)]" />
        <div className="h-12 animate-pulse rounded-2xl bg-[var(--c-surface)]" />
      </div>
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useUser()
  const { roles, activeRole, enableCoach, setActiveRole } = useRole()
  const wantsCoach = searchParams.get('intent') === 'coach'
  const redirectTo = searchParams.get('redirectTo')

  useEffect(() => {
    if (!user) return

    if (redirectTo) {
      router.replace(redirectTo)
      return
    }

    if (wantsCoach) {
      if (roles.coach) {
        setActiveRole('coach')
        return
      }

      void enableCoach().then(() => setActiveRole('coach'))
      return
    }

    router.replace(`/${activeRole}/home`)
  }, [
    user,
    redirectTo,
    wantsCoach,
    roles.coach,
    activeRole,
    enableCoach,
    setActiveRole,
    router,
  ])

  if (user === undefined) {
    return (
      <div className="min-h-[calc(100vh-2rem)] px-3 py-6 sm:grid sm:place-items-center sm:py-10">
        <AuthCardSkeleton />
      </div>
    )
  }

  if (user) {
    return (
      <div className="grid min-h-[calc(100vh-2rem)] place-items-center px-3 py-6">
        <Loading size="md" />
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-2rem)] px-3 py-6 sm:grid sm:place-items-center sm:py-10">
      <AuthCard />
    </div>
  )
}
