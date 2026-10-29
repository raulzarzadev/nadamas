import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
function load(path, deps = {}) {
  const module = { exports: {} }
  new Function(
    'require',
    'module',
    'exports',
    ts.transpileModule(readFileSync(path, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText
  )((id) => deps[id] || require(id), module, module.exports)
  return module.exports
}
const tenant = load('lib/tenant-host.ts')
const routing = load('lib/app-routing.ts')
const { NextRequest } = require('next/server')
const { proxy } = load('proxy.ts', {
  '@/lib/tenant-host': tenant,
  '@/lib/app-routing': routing,
})
function request(host, path = '/') {
  return proxy(new NextRequest(`https://${host}${path}`, { headers: { host } }))
}
test('app is reserved and never resolves as a school', () => {
  const { isValidSlug } = load('lib/slug.ts')
  assert.equal(isValidSlug('app'), false)
  assert.equal(tenant.tenantSlugFromHost('app.nadamas.app'), null)
  assert.equal(tenant.tenantSlugFromHost('app.localhost:3000'), null)
  assert.equal(tenant.tenantSlugFromHost('delfines.nadamas.app'), 'delfines')
})
test('installed apps keep product and invitation links on the original origin', () => {
  for (const path of [
    '/dashboard?source=pwa',
    '/athlete/home',
    '/login?redirectTo=%2Fschool',
    '/school/invitations/token',
    '/coach/agenda',
    '/auth/link?token=abc',
  ]) {
    assert.equal(request('nadamas.app', path).headers.get('location'), null)
  }
})
test('public pages and local previews remain on their origin', () => {
  for (const path of ['/', '/precio', '/coach/public-id', '/school/public-slug', '/api/schools']) {
    assert.equal(request('nadamas.app', path).headers.get('location'), null)
  }
  assert.equal(request('localhost:3000', '/login').headers.get('location'), null)
  assert.equal(request('preview.vercel.app', '/login').headers.get('location'), null)
})
test('app opens dashboard while schools keep their own home and login', () => {
  assert.equal(
    request('app.nadamas.app').headers.get('location'),
    'https://app.nadamas.app/dashboard'
  )
  assert.equal(request('app.nadamas.app', '/login').headers.get('x-middleware-rewrite'), null)
  assert.equal(
    request('delfines.nadamas.app').headers.get('x-middleware-rewrite'),
    'https://delfines.nadamas.app/school/delfines'
  )
  assert.equal(request('delfines.nadamas.app', '/login').headers.get('location'), null)
})

test('school routing never rewrites Firebase authentication helpers', () => {
  for (const host of ['nadamas.app', 'app.nadamas.app', 'delfines.nadamas.app']) {
    for (const path of ['/__/auth/handler?state=test', '/__/auth/iframe', '/__/auth/handler.js']) {
      assert.equal(request(host, path).headers.get('location'), null)
      assert.equal(request(host, path).headers.get('x-middleware-rewrite'), null)
    }
  }
})
const { firebaseAuthDomain, authLinkOrigin } = load('lib/firebase-auth-domain.ts')
test('same-origin OAuth only activates for configured callbacks', () => {
  const domains = 'nadamas.app, app.nadamas.app, school.nadamas.app'
  for (const host of ['nadamas.app', 'app.nadamas.app', 'school.nadamas.app']) {
    assert.equal(firebaseAuthDomain('project.firebaseapp.com', host, domains), host)
  }
  for (const host of [undefined, 'localhost', 'preview.vercel.app', 'other.nadamas.app']) {
    assert.equal(
      firebaseAuthDomain('project.firebaseapp.com', host, domains),
      'project.firebaseapp.com'
    )
  }
})
test('OTP links preserve configured origins without trusting arbitrary hosts', () => {
  const domains = 'nadamas.app,app.nadamas.app,school.nadamas.app'
  const fallback = 'https://nadamas.app'
  assert.equal(
    authLinkOrigin('https://app.nadamas.app/api/auth/otp/request', fallback, domains),
    'https://app.nadamas.app'
  )
  assert.equal(
    authLinkOrigin('https://school.nadamas.app/api/auth/otp/request', fallback, domains),
    'https://school.nadamas.app'
  )
  assert.equal(
    authLinkOrigin('https://untrusted.example/api/auth/otp/request', fallback, domains),
    fallback
  )
})
test('Firebase helpers are reverse proxied and permit only same-origin framing', async () => {
  const { default: config } = await import('../../next.config.mjs')
  const rewrites = await config.rewrites()
  assert.equal(
    rewrites.beforeFiles.find((rule) => rule.source === '/__/auth/:path*').destination,
    'https://nadamas-b1ecf.firebaseapp.com/__/auth/:path*'
  )
  const rules = await config.headers()
  const helper = rules.find((rule) => rule.source === '/__/auth/:path*')
  assert.equal(
    helper.headers.find((header) => header.key === 'X-Frame-Options').value,
    'SAMEORIGIN'
  )
  assert.equal(helper.headers.find((header) => header.key === 'Cache-Control').value, 'no-store')
  const deny = rules.find((rule) =>
    rule.headers.some((header) => header.key === 'X-Frame-Options' && header.value === 'DENY')
  )
  assert.match(deny.source, /__\/auth/)
})

test('development login stays on localhost including its current port', () => {
  assert.equal(routing.appLoginHref('development'), '/login')
  for (const origin of [
    'http://localhost:3000',
    'http://127.0.0.1:3002',
    'http://school.localhost:3100',
  ]) {
    assert.equal(new URL(routing.appLoginHref('development'), origin).origin, origin)
  }
  assert.equal(routing.appLoginHref('production'), 'https://app.nadamas.app/login')
})
