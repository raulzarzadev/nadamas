export const GENERIC_USER_ERROR =
  'Ups, algo salió mal. Inténtalo de nuevo más tarde.'

export function reportInternalError(scope: string, error: unknown) {
  const code = `${scope}-${Date.now().toString(36).toUpperCase()}`
  // Keep browser-visible logs safe. Detailed diagnostics should go to private
  // observability, not to user-facing UI or public client consoles.
  console.error(`[${code}]`)
  return code
}
