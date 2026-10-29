'use client'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import ProfileLoadingSkeleton from '@/components/ui/profile-loading-skeleton'
import { useUser } from '@/context/UserContext'
import { needsOnboarding } from '@/lib/onboarding/model'

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user } = useUser() as { user: unknown }
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams()?.toString()
  // Keep the query string (e.g. ?invite=) so login returns to the exact link.
  const returnTo = pathname ? `${pathname}${search ? `?${search}` : ''}` : ''

  const setupEntry = [
    '/athlete/progress',
    '/athlete/schedule',
    '/coach/agenda',
    '/school/classes',
    '/school',
  ].includes(pathname)
  const needsSetup = setupEntry && needsOnboarding(user as Parameters<typeof needsOnboarding>[0])

  useEffect(() => {
    if (user === null) {
      const target = returnTo ? `/login?redirectTo=${encodeURIComponent(returnTo)}` : '/login'
      router.replace(target)
    }
    if (user && needsSetup) router.replace('/welcome')
  }, [user, returnTo, router, needsSetup])

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
  if (needsSetup)
    return (
      <main className="mx-auto max-w-xl px-6 py-16">
        <h1 className="text-3xl font-extrabold">Vamos a configurar tu perfil.</h1>
        <p className="mt-4 text-sm">
          Elige cómo quieres usar Nadamas y descubre tus primeros pasos.
        </p>
        <Link href="/welcome" className="btn btn-primary mt-6">
          Configurar mi perfil
        </Link>
      </main>
    )
  return <>{children}</>
}
