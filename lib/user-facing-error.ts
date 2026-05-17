export const GENERIC_USER_ERROR =
  'Ups, algo salió mal. Inténtalo de nuevo más tarde.'

export function reportInternalError(scope: string, error: unknown) {
  const code = `${scope}-${Date.now().toString(36).toUpperCase()}`
  console.error(`[${code}]`, error)
  return code
}
