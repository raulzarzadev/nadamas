'use client'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import ProfileLoadingSkeleton from '@/components/ui/profile-loading-skeleton'
import { useUser } from '@/context/UserContext'

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user } = useUser() as { user: unknown }
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams()?.toString()
  // Keep the query string (e.g. ?invite=) so login returns to the exact link.
  const returnTo = pathname ? `${pathname}${search ? `?${search}` : ''}` : ''

  useEffect(() => {
    if (user === null) {
      const target = returnTo ? `/login?redirectTo=${encodeURIComponent(returnTo)}` : '/login'
      router.replace(target)
    }
  }, [user, returnTo, router])

  if (user === undefined) return <ProfileLoadingSkeleton />
  if (user === null)
    return (
      <div className="grid min-h-[calc(100vh-2rem)] place-items-center px-5 py-10">
        <div className="text-center">
          <p className="text-sm text-(--c-text-2)">Tu sesión no está activa.</p>
          <Link
            href={`/login?redirectTo=${encodeURIComponent(returnTo || '/')}`}
            className="btn btn-primary mt-4"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    )
  return <>{children}</>
}
