import 'server-only'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { tenantSlugFromHost } from '@/lib/tenant-host'
import { getSchoolBySlug } from './schools'

export const getTenantSchool = cache(async () => {
  const slug = tenantSlugFromHost((await headers()).get('host'))
  if (!slug) return null
  const school = await getSchoolBySlug(slug)
  return school
})

/** Route groups may return 404; the root layout must always render html/body. */
export async function requireTenantSchool() {
  const school = await getTenantSchool()
  if (!school && tenantSlugFromHost((await headers()).get('host'))) notFound()
  return school
}
