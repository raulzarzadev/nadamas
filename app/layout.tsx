import '../styles/globals.css'
import { PITCH_TEXT } from '@comps/marketing/summary'
import type { Metadata, Viewport } from 'next'
import type { CSSProperties } from 'react'
import { TenantSchoolProvider } from '@/context/TenantSchoolContext'
import { resolveSchoolPalette } from '@/lib/school-theme'
import { getTenantBrand, getTenantSchool } from '@/lib/server/tenant-school'
import { PHProvider } from './posthog-provider'

const baseMetadata: Metadata = {
  metadataBase: new URL('https://nadamas.app'),
  manifest: '/manifest.json',
  title: {
    default: 'nadamas.app | Coaches de natación y seguimiento de progreso',
    template: '%s | nadamas.app',
  },
  description: PITCH_TEXT,
  applicationName: 'nadamas.app',
  authors: [{ name: 'nadamas.app', url: 'https://nadamas.app' }],
  creator: 'nadamas.app',
  publisher: 'nadamas.app',
  category: 'sports',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    title: 'nadamas.app — natación para atletas, entrenadores y clubes',
    description: PITCH_TEXT,
    siteName: 'nadamas.app',
    locale: 'es_MX',
    type: 'website',
    images: [
      {
        url: '/og-nadamas.png',
        width: 1200,
        height: 630,
        alt: 'Logo de nadamas.app',
        type: 'image/png',
      },
    ],
  },
  // X/Twitter falls back to og:image, so page-level OG images (school logos) win.
  twitter: { card: 'summary_large_image' },
  formatDetection: { email: false, address: false, telephone: false },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icons/icon_x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon_x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon_x192.png', sizes: '192x192', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    title: 'Nadamas',
    statusBarStyle: 'default',
  },
}

export async function generateMetadata(): Promise<Metadata> {
  // Non-public tenant schools get default nadamas branding (nothing identifying).
  const school = await getTenantBrand()
  if (!school) return baseMetadata
  const icon = school.logoUrl || '/tenant-icon'
  return {
    ...baseMetadata,
    title: { default: school.name, template: `%s | ${school.name}` },
    description: school.description || `Escuela ${school.name}`,
    applicationName: school.name,
    manifest: '/tenant-manifest',
    metadataBase: new URL(`https://${school.slug}.nadamas.app`),
    icons: { icon: [{ url: icon }], apple: [{ url: icon }] },
    appleWebApp: { capable: true, title: school.name, statusBarStyle: 'default' },
    openGraph: {
      title: school.name,
      description: school.description || `Escuela ${school.name}`,
      siteName: school.name,
      locale: 'es_MX',
      type: 'website',
      images: [{ url: icon }],
    },
    twitter: { card: 'summary', images: [icon] },
  }
}

const baseViewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export async function generateViewport(): Promise<Viewport> {
  const school = await getTenantBrand()
  const palette = school ? resolveSchoolPalette(school) : null
  return { ...baseViewport, ...(palette ? { themeColor: palette.primary } : {}) }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const school = await getTenantSchool()
  const brand = await getTenantBrand()
  const palette = brand ? resolveSchoolPalette(brand) : null
  const theme = palette
    ? ({
        '--tenant-primary': palette.primary,
        '--tenant-secondary': palette.secondary,
        '--tenant-accent': palette.accent,
        '--tenant-surface': palette.surface,
      } as CSSProperties)
    : undefined
  // Non-public: keep id/slug for tenant scoping, redact everything identifying.
  const tenant = school
    ? {
        id: school.id,
        slug: school.slug,
        bookingMode: school.bookingMode || 'request',
        name: brand ? school.name : '',
        description: brand ? school.description : '',
        logoUrl: (brand && school.logoUrl) || null,
        palette: brand ? school.palette : undefined,
        redacted: !brand,
      }
    : null
  return (
    <html lang="es" data-tenant-school={school?.slug} style={theme}>
      <body>
        <TenantSchoolProvider school={tenant}>
          <PHProvider>{children}</PHProvider>
        </TenantSchoolProvider>
      </body>
    </html>
  )
}
