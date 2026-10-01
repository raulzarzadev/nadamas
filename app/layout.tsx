import '../styles/globals.css'
import type { Metadata, Viewport } from 'next'
import type { CSSProperties } from 'react'
import { TenantSchoolProvider } from '@/context/TenantSchoolContext'
import { SCHOOL_PALETTES } from '@/lib/school'
import { getTenantSchool } from '@/lib/server/tenant-school'
import { PHProvider } from './posthog-provider'

const baseMetadata: Metadata = {
  metadataBase: new URL('https://nadamas.app'),
  manifest: '/manifest.json',
  title: {
    default: 'nadamas.app | Coaches de natación y seguimiento de progreso',
    template: '%s | nadamas.app',
  },
  description:
    'Encuentra coaches de natación verificados, reserva clases y da seguimiento al progreso de tu entrenamiento.',
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
  const school = await getTenantSchool()
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
  }
}

const baseViewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export async function generateViewport(): Promise<Viewport> {
  const school = await getTenantSchool()
  const palette = school
    ? SCHOOL_PALETTES.find((item) => item.value === school.palette) || SCHOOL_PALETTES[0]
    : null
  return { ...baseViewport, ...(palette ? { themeColor: palette.primary } : {}) }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const school = await getTenantSchool()
  const palette = school
    ? SCHOOL_PALETTES.find((item) => item.value === school.palette) || SCHOOL_PALETTES[0]
    : null
  const theme = palette
    ? ({
        '--tenant-primary': palette.primary,
        '--tenant-secondary': palette.secondary,
        '--tenant-accent': palette.accent,
        '--tenant-surface': palette.surface,
      } as CSSProperties)
    : undefined
  const tenant = school
    ? {
        id: school.id,
        name: school.name,
        slug: school.slug,
        logoUrl: school.logoUrl || null,
        palette: school.palette,
        description: school.description,
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
