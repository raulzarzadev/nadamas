import type { Instrumentation } from 'next'

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { captureServerException } = await import('@/lib/analytics/server')
  const header = (name: string) => {
    const value = request.headers[name]
    return typeof value === 'string' ? value : undefined
  }
  await captureServerException(error, `NEXT_${context.routeType}`, {
    path: request.path,
    method: request.method,
    requestId: header('x-nadamas-request-id'),
    distinctId: header('x-nadamas-analytics-id'),
    sessionId: header('x-nadamas-session-id'),
  })
}
