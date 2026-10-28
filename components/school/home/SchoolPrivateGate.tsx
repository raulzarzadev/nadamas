'use client'

import Link from 'next/link'
import Loading from '@/components/Loading'
import { SCHOOL_HOME_SECTION_CLASS } from './SchoolEventsList'
import SchoolMemberDashboard from './SchoolMemberDashboard'
import type { SchoolGateStatus } from './use-school-member-data'

/**
 * What a non-member sees in place of a non-public school's content. Never mentions the
 * school itself: signed out → login prompt back to `redirectTo`; otherwise unavailable.
 */
export function SchoolGateMessage({
  status,
  redirectTo,
}: {
  status: SchoolGateStatus
  redirectTo: string
}) {
  if (status === 'loading') return <Loading />
  return (
    <section className={`${SCHOOL_HOME_SECTION_CLASS} grid justify-items-start gap-4`}>
      {status === 'signed-out' ? (
        <>
          <h1 className="text-xl font-extrabold text-(--c-ocean)">
            Inicia sesión para ver tu escuela
          </h1>
          <Link
            href={`/login?redirectTo=${encodeURIComponent(redirectTo)}`}
            className="inline-flex min-h-12 items-center rounded-full bg-(--school-primary) px-6 font-bold text-white transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            Iniciar sesión
          </Link>
        </>
      ) : (
        <h1 className="text-xl font-extrabold text-(--c-ocean)">
          Esta escuela no está disponible.
        </h1>
      )}
    </section>
  )
}

/** Home of a non-public school: members get the dashboard, everyone else a neutral gate. */
export default function SchoolPrivateGate({ schoolId, slug }: { schoolId: string; slug: string }) {
  return (
    <SchoolMemberDashboard
      schoolId={schoolId}
      fallback={(status) => <SchoolGateMessage status={status} redirectTo={`/school/${slug}`} />}
    />
  )
}
