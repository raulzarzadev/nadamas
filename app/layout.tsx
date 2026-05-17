import '../styles/globals.css'
import { PHProvider } from './posthog-provider'

export const metadata = {
  title: 'nadamas',
  description: 'App for swim trainers and coaches focused on athlete performance',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        <PHProvider>{children}</PHProvider>
      </body>
    </html>
  )
}
