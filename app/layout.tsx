import '../styles/globals.css'
import type { Metadata, Viewport } from 'next'
import { PHProvider } from './posthog-provider'

export const metadata: Metadata = {
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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <PHProvider>{children}</PHProvider>
      </body>
    </html>
  )
}
