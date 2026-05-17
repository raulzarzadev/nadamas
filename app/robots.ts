import type { MetadataRoute } from 'next'
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: '/', disallow: ['/dashboard', '/login', '/logout'] }, sitemap: 'https://nadamas.app/sitemap.xml' }
}
