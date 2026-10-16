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
test('root product links move to app preserving invitation tokens and queries', () => {
  for (const path of [
    '/login?redirectTo=%2Fschool',
    '/school/invitations/token',
    '/coach/agenda',
    '/auth/link?token=abc',
  ]) {
    assert.equal(
      request('nadamas.app', path).headers.get('location'),
      `https://app.nadamas.app${path}`
    )
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
