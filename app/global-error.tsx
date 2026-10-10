'use client'
import ErrorFallback from '@/components/analytics/ErrorFallback'
export default function GlobalError(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="es">
      <body>
        <ErrorFallback {...props} />
      </body>
    </html>
  )
}
