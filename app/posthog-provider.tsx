'use client'
import { usePathname } from 'next/navigation'
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { useEffect } from 'react'
import { useTenantSchool } from '@/context/TenantSchoolContext'
import { analyticsEnabled } from '@/lib/analytics/client'
import { privateReplayRoute } from '@/lib/analytics/privacy'

export function PHProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const tenant = useTenantSchool()
  useEffect(() => {
    if (!analyticsEnabled()) return
    // Authentication pages can carry one-time credentials; never record them.
    posthog.set_config({
      disable_session_recording: privateReplayRoute(pathname || ''),
    })
  }, [pathname])
  useEffect(() => {
    if (analyticsEnabled()) posthog.register({ tenant_school_id: tenant?.id || null })
  }, [tenant?.id])
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
