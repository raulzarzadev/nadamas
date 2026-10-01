'use client'
import AppNav from '@comps/app-chrome/AppNav'
import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'
import { tenantSlugFromHost } from '@/lib/tenant-host'
import SiteNav from './site-nav'

// Logged-in visitors get the same app chrome everywhere; logged-out visitors
// (and SEO crawlers) keep the marketing nav.
export default function MarketingNav() {
  const { user } = useUser() as { user: unknown }
  const [tenantHost, setTenantHost] = useState(false)

  useEffect(() => {
    setTenantHost(Boolean(tenantSlugFromHost(window.location.host)))
  }, [])

  if (tenantHost) return null
  if (user) return <AppNav />
  return <SiteNav />
}
