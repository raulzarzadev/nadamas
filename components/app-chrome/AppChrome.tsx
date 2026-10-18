'use client'

import { usePathname } from 'next/navigation'
import { SchoolTerminologyProvider } from '@/context/SchoolTerminologyContext'
import type { RoleName } from '@/lib/roles'
import AppNav from './AppNav'
import FloatingAssistant from './FloatingAssistant'
import PwaInstallPrompt from './PwaInstallPrompt'
import ScrollToTop from './ScrollToTop'

export default function AppChrome({
  mode,
  children,
}: {
  // Optional: when omitted (shared pages like /notifications) the nav follows the
  // active mode from RoleContext.
  mode?: RoleName
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const classDetails =
    pathname === '/school/classes/details' || pathname === '/coach/classes/details'
  return (
    <SchoolTerminologyProvider mode={mode}>
      {/* --app-tabbar-h = height of AppNav's mobile bottom tab bar (incl. home
          indicator inset); bottom-fixed UI offsets itself by it. */}
      <div
        data-theme="nadamas"
        className="min-h-screen bg-[var(--c-bg)] text-[var(--c-ocean)] max-sm:has-[[data-app-tabbar]]:[--app-tabbar-h:calc(4rem+env(safe-area-inset-bottom))]"
      >
        <ScrollToTop />
        {!classDetails && <AppNav mode={mode} />}
        <PwaInstallPrompt />
        <main
          className={`app-content mx-auto max-w-5xl px-0 pb-[calc(5rem+var(--app-tabbar-h,0px))] sm:px-4 sm:pb-24 ${classDetails ? 'pt-1 sm:pt-2' : 'pt-2 sm:pt-6'}`}
        >
          {children}
        </main>
        <FloatingAssistant />
      </div>
    </SchoolTerminologyProvider>
  )
}
