import 'server-only'
import { randomUUID } from 'node:crypto'
import { after } from 'next/server'
import { PostHog } from 'posthog-node'
import { analyticsRoute, safeDiagnostic } from './privacy'

let client: PostHog | undefined
function getClient() {
  const key = process.env.POSTHOG_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (
    !key ||
    process.env.NEXT_PUBLIC_POSTHOG_ENABLED === '0' ||
    (process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_POSTHOG_ENABLED !== '1')
  )
    return undefined
  client ||= new PostHog(key, {
    host:
      process.env.POSTHOG_HOST ||
      process.env.NEXT_PUBLIC_POSTHOG_HOST ||
      'https://us.i.posthog.com',
    flushAt: 1,
    flushInterval: 0,
    requestTimeout: 2000,
    fetchRetryCount: 1,
    enableExceptionAutocapture: false,
  })
  return client
}
function boundedId(value: string | null | undefined) {
  return value && /^[A-Za-z0-9_-]{1,128}$/.test(value) ? value : undefined
}
export async function captureServerException(
  error: unknown,
  scope: string,
  input?: {
    path?: string
    method?: string
    requestId?: string | null
    distinctId?: string | null
    sessionId?: string | null
  }
) {
  try {
    const posthog = getClient()
    if (!posthog) return
    const safe = new Error(safeDiagnostic(error instanceof Error ? error.message : scope))
    if (error instanceof Error) {
      safe.name = /^[A-Za-z_][A-Za-z0-9_]{0,60}$/.test(error.name) ? error.name : 'Error'
      if (error.stack) safe.stack = safeDiagnostic(error.stack)
    }
    await posthog.captureExceptionImmediate(safe, boundedId(input?.distinctId) || 'server', {
      error_scope: scope,
      route: analyticsRoute(input?.path || '/unknown'),
      method: input?.method,
      request_id: boundedId(input?.requestId) || randomUUID(),
      $session_id: boundedId(input?.sessionId),
      source: 'server',
      environment: process.env.NODE_ENV,
      release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_APP_RELEASE || 'local',
    })
  } catch {
    /* Observability must never break a request or disclose diagnostics. */
  }
}
/** Run after the response so handled errors are not lost in serverless workers. */
export function reportServerError(scope: string, error: unknown, request?: Request) {
  try {
    after(() =>
      captureServerException(error, scope, {
        path: request?.url,
        method: request?.method,
        requestId: request?.headers.get('x-nadamas-request-id'),
        distinctId: request?.headers.get('x-nadamas-analytics-id'),
        sessionId: request?.headers.get('x-nadamas-session-id'),
      })
    )
  } catch {
    /* Called outside a request; don't create a detached network task. */
  }
}
