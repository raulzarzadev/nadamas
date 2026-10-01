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
