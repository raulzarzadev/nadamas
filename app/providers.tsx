'use client'
import { Suspense } from 'react'
import { UserProvider } from '@/context/UserContext'
import { ThemeProvider } from '@/context/ThemeContext'
import Layout from '@comps/Layout'

export default function Providers({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={null}>
      <UserProvider>
        <ThemeProvider>
          <Layout>{children}</Layout>
        </ThemeProvider>
      </UserProvider>
    </Suspense>
  )
}
