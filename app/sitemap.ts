import type { MetadataRoute } from 'next'
import { resources } from '@/lib/marketing/resources'

const siteUrl = 'https://nadamas.app'

export default function sitemap(): MetadataRoute.Sitemap {
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
  ]
}
