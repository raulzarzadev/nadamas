'use client'
import { useEffect } from 'react'
import { reportClientError } from '@/lib/analytics/client'

export default function ErrorFallback({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    reportClientError('REACT_BOUNDARY', error, error.digest)
  }, [error])
  return (
    <main className="grid min-h-60 place-content-center gap-4 p-6 text-center">
      <h1 className="text-xl font-bold">Ups, algo salió mal.</h1>
      <p>Inténtalo de nuevo más tarde.</p>
      <button type="button" onClick={reset} className="btn btn-primary min-h-11">
        Intentar de nuevo
      </button>
    </main>
  )
}
