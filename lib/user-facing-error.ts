import { reportClientError } from '@/lib/analytics/client'
export const GENERIC_USER_ERROR = 'Ups, algo salió mal. Inténtalo de nuevo más tarde.'

export function reportInternalError(scope: string, _error: unknown) {
  const code = `${scope}-${Date.now().toString(36).toUpperCase()}`
  reportClientError(scope, _error, code)
  // Keep browser-visible logs safe. Detailed diagnostics should go to private
  // observability, not to user-facing UI or public client consoles.
  // Next's development overlay treats console.error as an uncaught runtime
  // error. Keep the trace code visible for debugging without masking the
  // actual form feedback during local development.
  if (process.env.NODE_ENV === 'development') console.warn(`[${code}]`)
  else console.error(`[${code}]`)
  return code
}
