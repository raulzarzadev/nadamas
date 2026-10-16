/** Only opt domains into same-origin OAuth after their Google callback is registered. */
export function firebaseAuthDomain(
  fallback: string,
  hostname: string | undefined,
  configuredDomains = ''
) {
  const domains = new Set(
    configuredDomains
      .split(',')
      .map((domain) => domain.trim().toLowerCase())
      .filter(Boolean)
  )
  return hostname && domains.has(hostname.toLowerCase()) ? hostname.toLowerCase() : fallback
}

/** Keep an email login on the origin where it was requested. */
export function authLinkOrigin(requestUrl: string, fallback: string, configuredDomains = '') {
  const url = new URL(requestUrl)
  const domain = firebaseAuthDomain('', url.hostname, configuredDomains)
  return url.protocol === 'https:' && domain ? url.origin : fallback
}
