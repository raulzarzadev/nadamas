import '../styles/globals.css'

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
      <body>{children}</body>
    </html>
  )
}
