import type { MetadataRoute } from 'next'
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/dashboard',
        '/login',
        '/logout',
        '/auth-gate',
        '/athlete/',
        '/admin/',
        '/profile',
        '/notifications',
      ],
    },
    sitemap: 'https://nadamas.app/sitemap.xml',
  }
}
