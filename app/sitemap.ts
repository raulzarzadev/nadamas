import type { MetadataRoute } from 'next'
export default function sitemap(): MetadataRoute.Sitemap { return [{ url: 'https://nadamas.app/', lastModified: new Date('2026-05-17'), changeFrequency: 'weekly', priority: 1 }] }
