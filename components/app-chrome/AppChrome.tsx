import type { RoleName } from '@/lib/roles'
import AppNav from './AppNav'
import ScrollToTop from './ScrollToTop'

export default function AppChrome({
  role,
  children,
}: {
  // Optional: when omitted (shared pages like /notifications) the nav follows the
  // active role from RoleContext.
  role?: RoleName
  children: React.ReactNode
}) {
  return (
    <div data-theme="nadamas" className="min-h-screen bg-[var(--c-bg)] text-[var(--c-ocean)]">
      <ScrollToTop />
      <AppNav role={role} />
      <main className="mx-auto max-w-5xl px-2.5 pb-20 pt-4 sm:px-4 sm:pb-24 sm:pt-6">
        {children}
      </main>
    </div>
  )
}
