'use client'

import { createContext, type ReactNode, useContext } from 'react'
import type { School } from '@/lib/school'

export type TenantSchool = Pick<
  School,
  'id' | 'name' | 'slug' | 'logoUrl' | 'palette' | 'description' | 'bookingMode'
>
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
