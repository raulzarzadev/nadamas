import { type NextRequest, NextResponse } from 'next/server'
import { isProductPath } from '@/lib/app-routing'
import { tenantSlugFromHost } from '@/lib/tenant-host'

export function proxy(request: NextRequest) {
  const slug = tenantSlugFromHost(request.headers.get('host'))
  const pathname = request.nextUrl.pathname
  const isAppRoute = isProductPath(pathname)
  const hostname = (request.headers.get('host') || '')
    .split(':')[0]
    .toLowerCase()
    .replace(/\.$/, '')

  if ((hostname === 'app.nadamas.app' || hostname === 'app.localhost') && pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  if (
    pathname.startsWith('/__/') ||
    !slug ||
    isAppRoute ||
    pathname.startsWith('/api/') ||
    pathname === '/tenant-icon' ||
    pathname === '/tenant-manifest' ||
    pathname === '/school' ||
    pathname.startsWith('/school/')
  ) {
    return NextResponse.next()
  }

  const url = request.nextUrl.clone()
  url.pathname = `/school/${slug}`
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
