import type { Metadata } from 'next'
import { requireTenantSchool } from '@/lib/server/tenant-school'
import Providers from '../providers'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  await requireTenantSchool()
  return <Providers>{children}</Providers>
}
