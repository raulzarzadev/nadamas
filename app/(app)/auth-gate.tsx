'use client'
import { useUser } from '@/context/UserContext'
import Loading from '@comps/Loading'
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user } = useUser()
  if (user === undefined) return <Loading />
  return <>{children}</>
}
