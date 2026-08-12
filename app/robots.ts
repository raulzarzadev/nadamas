import type { MetadataRoute } from 'next'

const siteUrl = 'https://nadamas.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/'],
      },
      {
        userAgent: ['OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'Claude-User'],
        allow: '/',
        disallow: ['/api/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
