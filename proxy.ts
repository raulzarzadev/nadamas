import { type NextRequest, NextResponse } from 'next/server'
import { tenantSlugFromHost } from '@/lib/tenant-host'

export function proxy(request: NextRequest) {
  const slug = tenantSlugFromHost(request.headers.get('host'))
  const pathname = request.nextUrl.pathname
  const isAppRoute =
    pathname === '/login' ||
    pathname === '/logout' ||
    pathname === '/profile' ||
    pathname === '/notifications' ||
    pathname === '/dashboard' ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/athlete/') ||
    pathname.startsWith('/coach/') ||
    pathname.startsWith('/admin/')

  if (
    !slug ||
    isAppRoute ||
    pathname.startsWith('/api/') ||
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
