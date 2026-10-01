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
  if (!school) notFound()
  return school
})
