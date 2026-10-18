import { readdirSync, readFileSync } from 'node:fs'

const origin = 'https://nadamas.app'
const files = readdirSync(new URL('../public/', import.meta.url)).filter((name) =>
  /^[a-f0-9]{32}\.txt$/.test(name)
)
if (files.length !== 1) throw new Error('Expected one public IndexNow verification file.')
const keyFile = files[0]
const key = readFileSync(new URL(`../public/${keyFile}`, import.meta.url), 'utf8').trim()
if (keyFile !== `${key}.txt`) throw new Error('IndexNow verification file does not match.')

async function getPublished(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000), redirect: 'error' })
  if (!response.ok) throw new Error(`Published resource unavailable (${response.status}): ${url}`)
  return response.text()
}

const keyLocation = `${origin}/${keyFile}`
if ((await getPublished(keyLocation)).trim() !== key) {
  throw new Error('Publish the IndexNow verification file before submitting URLs.')
}
const sitemap = await getPublished(`${origin}/sitemap.xml`)
const publicUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
if (!publicUrls.length || publicUrls.length > 10_000) throw new Error('Invalid sitemap size.')
const allowed = new Set(publicUrls)
const requested = process.argv.slice(2)
const urlList = [...new Set(requested.length ? requested : publicUrls)]
for (const value of urlList) {
  const url = new URL(value)
  if (url.origin !== origin || url.search || url.hash || !allowed.has(value)) {
    throw new Error('Submit only canonical public URLs listed in the sitemap.')
  }
}

const response = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: 'nadamas.app', key, keyLocation, urlList }),
  signal: AbortSignal.timeout(30_000),
})
if (response.status !== 200 && response.status !== 202) {
  throw new Error(`IndexNow submission failed (${response.status}).`)
}
console.log(
  `IndexNow received ${urlList.length} public URLs (${response.status}).${response.status === 202 ? ' Key validation pending.' : ''} Indexing is not guaranteed.`
)
