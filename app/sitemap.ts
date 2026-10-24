import type { MetadataRoute } from 'next'
import { resources } from '@/lib/marketing/resources'
import { getPublicCoachDirectory, publicCoachPath } from '@/lib/server/public-coach-directory'
import { isIndexableSchool, listPublicSchools } from '@/lib/server/schools'

const siteUrl = 'https://nadamas.app'

// Coach and school profiles change often; rebuild the sitemap hourly.
export const revalidate = 3600

async function coachEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const coaches = await getPublicCoachDirectory()
    return coaches.map((coach) => ({
      url: `${siteUrl}${publicCoachPath(coach)}`,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))
  } catch (error) {
    console.error('[SITEMAP_COACHES]', error)
    return []
  }
}

async function schoolEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const schools = await listPublicSchools()
    return schools
      .filter((school) => school.slug && isIndexableSchool(school))
      .map((school) => ({
        url: `${siteUrl}/school/${school.slug}`,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }))
  } catch (error) {
    console.error('[SITEMAP_SCHOOLS]', error)
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [coaches, schools] = await Promise.all([coachEntries(), schoolEntries()])
  return [
    { url: `${siteUrl}/recursos`, changeFrequency: 'monthly', priority: 0.8 },
    {
      url: `${siteUrl}/software-para-escuelas-de-natacion`,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    ...resources.map((resource) => ({
      url: `${siteUrl}/recursos/${resource.slug}`,
      lastModified: new Date(resource.updatedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    { url: `${siteUrl}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/coaches`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteUrl}/precio`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${siteUrl}/como-verificamos`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/contacto`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${siteUrl}/privacidad`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${siteUrl}/terminos`, changeFrequency: 'yearly', priority: 0.2 },
    ...coaches,
    ...schools,
  ]
}
