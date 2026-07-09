import '../styles/globals.css'
import type { Metadata, Viewport } from 'next'
import { PHProvider } from './posthog-provider'

export const metadata: Metadata = {
  metadataBase: new URL('https://nadamas.app'),
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
  formatDetection: { email: false, address: false, telephone: false },
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
