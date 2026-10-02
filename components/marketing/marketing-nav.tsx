'use client'
import AppNav from '@comps/app-chrome/AppNav'
import { useUser } from '@/context/UserContext'
import { useTenantSchool } from '@/context/TenantSchoolContext'
import SiteNav from './site-nav'

// Logged-in visitors get the same app chrome everywhere; logged-out visitors
// (and SEO crawlers) keep the marketing nav.
export default function MarketingNav() {
  const { user } = useUser() as { user: unknown }
  const tenant = useTenantSchool()

  if (tenant) return user ? <AppNav /> : <SiteNav />
  if (user) return <AppNav />
  return <SiteNav />
}
