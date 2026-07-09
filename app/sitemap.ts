import type { MetadataRoute } from 'next'

const siteUrl = 'https://nadamas.app'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return [
    { url: siteUrl, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/coaches`, lastModified, changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteUrl}/como-verificamos`, lastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/contacto`, lastModified, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${siteUrl}/privacidad`, lastModified, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${siteUrl}/terminos`, lastModified, changeFrequency: 'yearly', priority: 0.2 },
  ]
}
