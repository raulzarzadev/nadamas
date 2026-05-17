'use client'
import { Suspense } from 'react'
import { UserProvider } from '@/context/UserContext'
import { RoleProvider } from '@/context/RoleContext'
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <UserProvider>
        <RoleProvider>{children}</RoleProvider>
      </UserProvider>
    </Suspense>
  )
}
