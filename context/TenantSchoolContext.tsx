'use client'

import { createContext, type ReactNode, useContext } from 'react'
import type { School } from '@/lib/school'

export type TenantSchool = Pick<
  School,
  'id' | 'name' | 'slug' | 'logoUrl' | 'palette' | 'description' | 'bookingMode'
> & {
  /** Non-public school: name/logo were stripped server-side; show default branding. */
  redacted?: boolean
}
const TenantSchoolContext = createContext<TenantSchool | null>(null)
export function TenantSchoolProvider({
  school,
  children,
}: {
  school: TenantSchool | null
  children: ReactNode
}) {
  return <TenantSchoolContext.Provider value={school}>{children}</TenantSchoolContext.Provider>
}
export function useTenantSchool() {
  return useContext(TenantSchoolContext)
}

/** True when the tenant's own name/logo may be shown (public, non-redacted school). */
export function hasTenantBrand(tenant: TenantSchool | null): tenant is TenantSchool {
  return Boolean(tenant && !tenant.redacted && tenant.name)
}

/** Label for the tenant school in text; generic when the school is redacted. */
export function tenantDisplayName(tenant: TenantSchool | null) {
  return (hasTenantBrand(tenant) && tenant.name) || 'Escuela'
}
