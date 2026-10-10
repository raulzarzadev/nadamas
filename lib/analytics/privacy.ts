/** Analytics routes are templates: never send search terms, OTP links or document IDs. */
const routeParts = new Set(
  'rotate push-subscriptions test verification-requested verification-reviewed invitations reviews assignments locations quick history comments school-calendar school-invitations class-notes calendar feeds connection access-requests slug progress-entries schedule evaluation verify-link api athlete coach school admin auth login logout profile dashboard payments receipts settle bookings agenda schools students teachers classes class-requests cancellations reservations cancel reassign move attendance labels student-tags progress find-coach settings notifications read all additional-profiles users credentials otp request verify link events results teams metrics offerings availability schedules blocks contacts invite members coaches public create edit details sharing evaluations permissions roles subscriptions push status privacy terms contacto privacidad terminos como-verificamos'.split(
    ' '
  )
)
export function analyticsRoute(value: string) {
  try {
    const url = new URL(value, 'https://local.invalid')
    return url.pathname
      .split('/')
      .map((part) => (!part || routeParts.has(part) ? part : ':id'))
      .join('/')
  } catch {
    return '/unknown'
  }
}
export function safeDiagnostic(value: string) {
  return value
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email]')
    .replace(/https?:\/\/[^\s)"']+/g, (url) => {
      try {
        const parsed = new URL(url)
        return `${parsed.origin}${parsed.pathname.startsWith('/_next/') ? parsed.pathname : analyticsRoute(url)}`
      } catch {
        return '[url]'
      }
    })
    .replace(/\b(?:phc_|phx_|sk-|eyJ)[A-Za-z0-9._-]+/g, '[secret]')
    .replace(/\b\d{10,}\b/g, '[number]')
    .slice(0, 1200)
}
const privateKey =
  /^(?:email|name|firstName|lastName|displayName|phone|text|\$el_text|\$elements|\$elements_chain|body|data|requestBody|responseBody|requestHeaders|responseHeaders|authorization|password|token|receipt|receiptPath|transferDetails|transferInstructions|bank|holder|account|clabe|reference|file|filename|\$initial_referring_domain)$/i
/** Defense in depth for event properties; replay payloads use SDK masking instead. */
export function sanitizeAnalyticsProperties(
  input: Record<string, unknown>,
  depth = 0
): Record<string, unknown> {
  if (depth > 8) return {}
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    // Preserve only app chunk filenames so error source maps remain usable.
    if (key === 'filename' && typeof value === 'string' && value.includes('/_next/')) {
      result[key] = safeDiagnostic(value)
      continue
    }
    if (privateKey.test(key) || /^(?:attr__|\$attr-)/i.test(key)) continue
    if (typeof value === 'string') {
      result[key] = /url|href|pathname|referrer/i.test(key)
        ? analyticsRoute(value)
        : safeDiagnostic(value)
    } else if (Array.isArray(value)) {
      result[key] = value
        .slice(0, 100)
        .map((item) =>
          typeof item === 'object' && item !== null
            ? sanitizeAnalyticsProperties(item as Record<string, unknown>, depth + 1)
            : typeof item === 'string'
              ? safeDiagnostic(item)
              : item
        )
    } else if (value && typeof value === 'object') {
      result[key] = sanitizeAnalyticsProperties(value as Record<string, unknown>, depth + 1)
    } else result[key] = value
  }
  return result
}

export function analyticsModal(label: string) {
  const categories = [
    'pago',
    'plan',
    'comprobante',
    'horario',
    'solicitud',
    'alumno',
    'entrenador',
    'clase',
    'perfil',
    'etiqueta',
    'evaluación',
    'progreso',
    'escuela',
    'invitación',
    'cancelar',
    'eliminar',
    'crear',
    'editar',
    'configuración',
  ]
  return (
    categories
      .filter((word) => label.toLowerCase().includes(word))
      .slice(0, 3)
      .join('_') || 'dialog'
  )
}

/** Auth and invitation pages can contain one-time credentials. */
export function privateReplayRoute(pathname: string) {
  return /^\/(auth|login|logout)(?:\/|$)/.test(pathname) || /\/invitations(?:\/|$)/.test(pathname)
}
