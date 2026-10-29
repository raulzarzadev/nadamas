export function getPublicSchoolUrl(slug: string) {
  if (typeof window === 'undefined') return `https://${slug}.nadamas.app/`
  const { hostname, origin, port, protocol } = window.location
  if (hostname.endsWith('.localhost'))
    return `${protocol}//${slug}.localhost${port ? `:${port}` : ''}/`
  if (hostname === 'nadamas.app' || hostname.endsWith('.nadamas.app')) {
    return `${protocol}//${slug}.nadamas.app/`
  }
  return `${origin}/school/${slug}`
}

export function getShareablePublicSchoolUrl(slug: string) {
  if (typeof window !== 'undefined') {
    const { hostname, port, protocol } = window.location
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost')) {
      return `${protocol}//${slug}.localhost${port ? `:${port}` : ''}/`
    }
  }
  return `https://${slug}.nadamas.app/`
}
