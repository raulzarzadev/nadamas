import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

const module = { exports: {} }
const code = ts.transpileModule(
  readFileSync(new URL('../../lib/client/body-scroll-lock.ts', import.meta.url), 'utf8'),
  {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }
).outputText
new Function('module', 'exports', code)(module, module.exports)
const { lockBodyScroll } = module.exports

for (const order of [
  [0, 1, 2],
  [2, 1, 0],
  [1, 0, 2],
]) {
  test(`page scrolling is restored after nested dialogs close in order ${order}`, () => {
    const body = { style: { overflow: 'auto' } }
    const releases = [lockBodyScroll(body), lockBodyScroll(body), lockBodyScroll(body)]
    for (const index of order.slice(0, -1)) {
      releases[index]()
      releases[index]()
      assert.equal(body.style.overflow, 'hidden')
    }
    releases[order.at(-1)]()
    assert.equal(body.style.overflow, 'auto')
    const release = lockBodyScroll(body)
    release()
    assert.equal(body.style.overflow, 'auto')
  })
}
