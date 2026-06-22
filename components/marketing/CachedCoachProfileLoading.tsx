'use client'

import CoachPublicProfile from '@comps/coach/CoachPublicProfile'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { readCachedCoachProfile } from '@/lib/client/coach-profile-cache'

export default function CachedCoachProfileLoading() {
  const pathname = usePathname()
  const id = pathname.split('/').filter(Boolean).at(-1) || ''
  const cached = id ? readCachedCoachProfile(id) : null

  if (!cached) {
    return (
      <section className="mx-auto max-w-[1040px] px-5 py-12 sm:px-8 lg:py-16">
        <div className="rounded-[32px] border border-[var(--c-border)] bg-white p-8 text-[var(--c-text-2)] shadow-[var(--shadow-sm)]">
          Cargando perfil…
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-[1040px] px-5 py-12 sm:px-8 lg:py-16">
      <Link
        href="/coaches"
        className="inline-flex items-center rounded-full border border-[var(--c-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--c-ocean)] transition hover:border-[var(--c-aqua)]"
      >
        Volver a coaches
      </Link>

      <div className="mt-6 rounded-[32px] border border-[var(--c-border)] bg-[var(--c-bg)] p-5 shadow-[var(--shadow-sm)] sm:p-7">
        <CoachPublicProfile coach={cached.coach} name={cached.name} />
      </div>
    </section>
  )
}
