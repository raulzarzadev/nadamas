'use client'
import { Suspense } from 'react'
import { UserProvider } from '@/context/UserContext'
import { ThemeProvider } from '@/context/ThemeContext'
export default function Providers({ children }: { children: React.ReactNode }) {
  return (<Suspense fallback={null}><UserProvider><ThemeProvider>{children}</ThemeProvider></UserProvider></Suspense>)
}
