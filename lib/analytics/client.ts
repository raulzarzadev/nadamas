import posthog from 'posthog-js'
import { analyticsRoute, sanitizeAnalyticsProperties } from './privacy'

export function analyticsEnabled() {
  return (
    Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY) &&
    process.env.NEXT_PUBLIC_POSTHOG_ENABLED !== '0' &&
    (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_POSTHOG_ENABLED === '1')
  )
}
export function trackEvent(event: string, properties: Record<string, unknown> = {}) {
  if (typeof window === 'undefined' || !analyticsEnabled()) return
  try {
    posthog.capture(event, sanitizeAnalyticsProperties(properties))
  } catch {
    /* Analytics never blocks the product. */
  }
}
export function reportClientError(scope: string, error: unknown, traceCode?: string) {
  if (typeof window === 'undefined' || !analyticsEnabled()) return
  try {
    posthog.captureException(error instanceof Error ? error : new Error(scope), {
      error_scope: scope,
      trace_code: traceCode,
      request_id: scope === 'API_REQUEST' ? traceCode : undefined,
      handled: true,
    })
  } catch {
    /* Best effort. */
  }
}
export function analyticsRequestHeaders(): Record<string, string> {
  if (typeof window === 'undefined' || !analyticsEnabled()) return {}
  try {
    return {
      'x-nadamas-analytics-id': posthog.get_distinct_id(),
      'x-nadamas-session-id': posthog.get_session_id(),
    }
  } catch {
    return {}
  }
}
const actions = new Set(
  'settings product purchase review adjust refund create update delete cancel approve reject assign unassign attended move archive unarchive mark-read subscribe unsubscribe'.split(
    ' '
  )
)
export function mutationAction(body?: BodyInit | null) {
  if (typeof body !== 'string' || body.length > 100_000) return undefined
  try {
    const action = JSON.parse(body).action
    return actions.has(action) ? (action as string) : undefined
  } catch {
    return undefined
  }
}
export function recordApiRequest(input: {
  path: string
  method: string
  duration: number
  status: number
  requestId: string
  action?: string
  code?: string
}) {
  const route = analyticsRoute(input.path)
  const mutation = input.method !== 'GET'
  const success = input.status >= 200 && input.status < 300
  const props = {
    route,
    method: input.method,
    duration_ms: Math.round(input.duration),
    status: input.status,
    request_id: input.requestId,
    action: input.action,
    error_code: input.code,
    outcome: success ? 'success' : 'failure',
  }
  if (input.status === 0 || input.status >= 500)
    reportClientError(
      'API_REQUEST',
      new Error(`${input.method} ${route}: ${input.status || 'network_error'}`),
      input.requestId
    )
  // Keep all failures, mutations and slow requests; sample fast successful reads.
  if (mutation || !success || input.duration >= 1500 || Math.random() < 0.1)
    trackEvent('api_request_completed', props)
  if (mutation) {
    trackEvent(success ? 'action_completed' : 'action_failed', props)
    if (route.startsWith('/api/payments'))
      trackEvent(
        `payment_${input.action || (route.endsWith('/receipts') ? 'receipt_upload' : 'update')}_${success ? 'succeeded' : 'failed'}`,
        props
      )
    else if (/bookings|class-requests|\/classes/.test(route))
      trackEvent(`booking_action_${success ? 'succeeded' : 'failed'}`, props)
  }
}
