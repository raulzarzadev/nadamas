const ROOT_DOMAIN = 'nadamas.app'

export function tenantSlugFromHost(hostHeader: string | null) {
  const hostname = (hostHeader || '').split(':')[0].toLowerCase().replace(/\.$/, '')
  if (!hostname || hostname === ROOT_DOMAIN || hostname === `www.${ROOT_DOMAIN}`) return null

  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    const subdomain = hostname.slice(0, -(ROOT_DOMAIN.length + 1))
    return subdomain && !subdomain.includes('.') && subdomain !== 'www' ? subdomain : null
  }

  if (hostname.endsWith('.localhost')) {
    const subdomain = hostname.slice(0, -'.localhost'.length)
    return subdomain && !subdomain.includes('.') ? subdomain : null
  }

  return null
}
