import '../styles/globals.css'
import { PHProvider } from './posthog-provider'

export const metadata = {
  title: 'nadamas',
  description:
    'Plataforma para coaches de natación: publica horarios, administra tu calendario y mide el progreso de tus alumnos.',
}

export const viewport = {
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
