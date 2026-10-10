import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

function load(path, dependencies = {}, env = {}, window = {}) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', 'process', 'window', code)(
    (id) => {
      if (!(id in dependencies)) throw new Error(`Unexpected import ${id}`)
      return dependencies[id]
    },
    module,
    module.exports,
    { env },
    window
  )
  return module.exports
}
const privacy = load('../../lib/analytics/privacy.ts')
const enabled = { NEXT_PUBLIC_POSTHOG_KEY: 'test', NEXT_PUBLIC_POSTHOG_ENABLED: '1' }
function client(sdk, env = enabled) {
  return load(
    '../../lib/analytics/client.ts',
    { 'posthog-js': { __esModule: true, default: sdk }, './privacy': privacy },
    env
  )
}

test('routes remove student IDs, query strings and sign-in credentials', () => {
  assert.equal(
    privacy.analyticsRoute('https://nanda.test/api/students/user-secret?token=secret'),
    '/api/students/:id'
  )
  assert.equal(privacy.analyticsRoute('/auth?oobCode=secret#credentials'), '/auth')
})
test('nested events remove financial data, files, user text and credentials', () => {
  const result = privacy.sanitizeAnalyticsProperties({
    route: '/api/payments',
    email: 'person@example.com',
    body: { secret: true },
    nested: { clabe: '123456789012345678', receiptPath: 'secret.png', status: 'pending' },
    $current_url: 'https://nanda.test/athlete/payments?token=secret',
    message: 'Bearer private-token person@example.com 123456789012345678',
    $el_text: 'private name',
  })
  assert.deepEqual(result.nested, { status: 'pending' })
  assert.equal(result.$current_url, '/athlete/payments')
  assert.equal(result.email, undefined)
  assert.equal(result.body, undefined)
  assert.equal(result.$el_text, undefined)
  assert.equal(result.message, 'Bearer [redacted] [email] [number]')
})
test('modal categories never include names', () => {
  assert.equal(privacy.analyticsModal('Pago de María Pérez'), 'pago')
  assert.equal(privacy.analyticsModal('María Pérez'), 'dialog')
})
test('payment errors retain route, outcome and correlation without the payload', () => {
  const events = []
  const api = client({ capture: (event, properties) => events.push({ event, properties }) })
  api.recordApiRequest({
    path: '/api/payments?studentId=secret',
    method: 'POST',
    duration: 251.2,
    status: 409,
    requestId: 'request-1',
    action: 'purchase',
    code: 'PAYMENT_REJECTED',
  })
  assert.deepEqual(
    events.map((item) => item.event),
    ['api_request_completed', 'action_failed', 'payment_purchase_failed']
  )
  assert.equal(events[0].properties.route, '/api/payments')
  assert.equal(events[0].properties.request_id, 'request-1')
  assert.equal(events[0].properties.duration_ms, 251)
  assert.equal(api.mutationAction('{"action":"purchase","bank":"private"}'), 'purchase')
  assert.equal(api.mutationAction('{"action":"private free text"}'), undefined)
})
test('analytics is disabled locally by default and failures cannot break actions', () => {
  let calls = 0
  const api = client(
    { capture: () => calls++ },
    { NEXT_PUBLIC_POSTHOG_KEY: 'test', NODE_ENV: 'development' }
  )
  api.trackEvent('test')
  assert.equal(calls, 0)
  assert.deepEqual(api.analyticsRequestHeaders(), {})
  const broken = client({
    capture: () => {
      throw new Error('offline')
    },
    captureException: () => {
      throw new Error('offline')
    },
    get_distinct_id: () => {
      throw new Error('offline')
    },
  })
  assert.doesNotThrow(() => broken.trackEvent('test'))
  assert.doesNotThrow(() => broken.reportClientError('TEST', new Error('test')))
  assert.deepEqual(broken.analyticsRequestHeaders(), {})
})
test('replay masks input, text, files and network bodies; auth snapshots are rejected', () => {
  let config
  const location = { pathname: '/login' }
  load(
    '../../instrumentation-client.ts',
    {
      'posthog-js': {
        __esModule: true,
        default: {
          init: (_key, options) => {
            config = options
          },
        },
      },
      '@/lib/analytics/client': { analyticsEnabled: () => true },
      '@/lib/analytics/privacy': privacy,
    },
    enabled,
    { location }
  )
  assert.equal(config.disable_session_recording, true)
  assert.equal(config.session_recording.maskAllInputs, true)
  assert.equal(config.session_recording.maskTextSelector, '*')
  assert.match(config.session_recording.blockSelector, /img/)
  assert.equal(config.session_recording.recordBody, false)
  assert.equal(config.enable_recording_console_log, false)
  assert.equal(config.before_send({ event: '$snapshot', properties: {} }), null)
  const request = config.session_recording.maskCapturedNetworkRequestFn({
    name: '/api/payments?secret=value',
    requestBody: 'private',
    responseBody: 'private',
    requestHeaders: { authorization: 'secret' },
  })
  assert.equal(request.name, '/api/payments')
  assert.equal(request.requestBody, undefined)
  assert.equal(request.requestHeaders, undefined)
})
test('server exceptions are sanitized, correlated and flushed after the response', async () => {
  const events = [],
    pending = []
  const server = load(
    '../../lib/analytics/server.ts',
    {
      'server-only': {},
      'node:crypto': { randomUUID: () => 'generated-id' },
      'next/server': { after: (callback) => pending.push(callback) },
      'posthog-node': {
        PostHog: class {
          async captureExceptionImmediate(...args) {
            events.push(args)
          }
        },
      },
      './privacy': privacy,
    },
    enabled
  )
  server.reportServerError(
    'PAYMENTS_WRITE',
    new Error('person@example.com Bearer secret'),
    new Request('https://test/api/payments?token=private', {
      headers: {
        'x-nadamas-analytics-id': 'user-1',
        'x-nadamas-session-id': 'session-1',
        'x-nadamas-request-id': 'request-1',
      },
    })
  )
  assert.equal(events.length, 0)
  await pending[0]()
  assert.equal(events[0][0].message, '[email] Bearer [redacted]')
  assert.equal(events[0][1], 'user-1')
  assert.equal(events[0][2].route, '/api/payments')
  assert.equal(events[0][2].$session_id, 'session-1')
  assert.equal(events[0][2].request_id, 'request-1')
})

test('errors preserve app chunk filenames for source maps, never uploaded filenames', () => {
  const result = privacy.sanitizeAnalyticsProperties({
    frames: [
      { filename: 'https://test/_next/static/chunks/app.js?token=secret', lineno: 42 },
      { filename: 'private-receipt.png' },
    ],
  })
  assert.equal(result.frames[0].filename, 'https://test/_next/static/chunks/app.js')
  assert.equal(result.frames[0].lineno, 42)
  assert.equal(result.frames[1].filename, undefined)
})
test('handled API 5xx errors also reach error tracking with a correlation code', () => {
  const errors = []
  const api = client({ capture() {}, captureException: (...args) => errors.push(args) })
  api.recordApiRequest({
    path: '/api/students/private-id?email=private',
    method: 'GET',
    duration: 100,
    status: 500,
    requestId: 'request-2',
  })
  assert.equal(errors[0][0].message, 'GET /api/students/:id: 500')
  assert.equal(errors[0][1].trace_code, 'request-2')
})

test('invitation links are excluded from replay alongside authentication', () => {
  assert.equal(privacy.privateReplayRoute('/athlete/invitations/private-token'), true)
  assert.equal(privacy.privateReplayRoute('/auth/link'), true)
  assert.equal(privacy.privateReplayRoute('/school/payments'), false)
})
