'use client'

import Loading from '@comps/Loading'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useUser } from '@/context/UserContext'

export default function AuthenticatedLandingGate({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { user } = useUser() as { user: unknown | null | undefined }

  useEffect(() => {
    if (user) router.replace('/dashboard')
  }, [router, user])

  if (user !== null) {
    return <Loading size="lg" fullScreen label="Cargando tu espacio…" sublabel="" />
  }

  return children
}
