import type { Metadata } from 'next'

export const siteUrl = 'https://nadamas.app'

export function marketingMetadata(title: string, description: string, path: string): Metadata {
  const url = `${siteUrl}${path}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: 'nadamas.app',
      locale: 'es_MX',
      type: 'website',
      images: [{ url: `${siteUrl}/og-nadamas.png`, width: 1200, height: 630, alt: 'nadamas.app' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${siteUrl}/og-nadamas.png`],
    },
  }
}
