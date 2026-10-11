'use client'
import { Suspense } from 'react'
import AppStoreProvider from '@/components/app-chrome/AppStoreProvider'
import ProfileLoadingSkeleton from '@/components/ui/profile-loading-skeleton'
import { RoleProvider } from '@/context/RoleContext'
import { UserProvider } from '@/context/UserContext'
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ProfileLoadingSkeleton />}>
      <UserProvider>
        <AppStoreProvider>
          <RoleProvider>{children}</RoleProvider>
        </AppStoreProvider>
      </UserProvider>
    </Suspense>
  )
}
