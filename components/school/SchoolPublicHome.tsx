import Link from 'next/link'
import { FiArrowRight } from 'react-icons/fi'
import SchoolHero from '@/components/school/home/SchoolHero'
import SchoolHomeSections from '@/components/school/home/SchoolHomeSections'
import SchoolJoinButton from '@/components/school/home/SchoolJoinButton'
import SchoolMemberDashboard from '@/components/school/home/SchoolMemberDashboard'
import SchoolPageShell from '@/components/school/home/SchoolPageShell'
import type { School } from '@/lib/school'
import { visibleSchoolContacts } from '@/lib/school-contact'
import type { SchoolEvent } from '@/lib/school-events'
import { homeSectionsOf } from '@/lib/school-home'
import { resolveSchoolPalette } from '@/lib/school-theme'

function SchoolVisitorHome({
  school,
  publicEvents,
}: {
  school: School
  publicEvents: SchoolEvent[]
}) {
  return (
    <>
      <SchoolHero school={school} size="large">
        <SchoolJoinButton schoolId={school.id} slug={school.slug} />
        <Link
          href={`/athlete/search/school/${encodeURIComponent(school.id)}/schedule`}
          className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/60 px-6 font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          Explorar horarios de la escuela <FiArrowRight aria-hidden="true" />
        </Link>
      </SchoolHero>
      <SchoolHomeSections
        sections={homeSectionsOf(school)}
        schoolId={school.id}
        slug={school.slug}
        timezone={school.timezone || 'America/Mexico_City'}
        events={publicEvents}
        gallery={school.gallery ?? []}
        contacts={visibleSchoolContacts(school.contacts)}
        showPrivateTag={false}
      />
    </>
  )
}

export default function SchoolPublicHome({
  school,
  publicEvents,
}: {
  school: School
  publicEvents: SchoolEvent[]
}) {
  return (
    <SchoolPageShell palette={resolveSchoolPalette(school)}>
      <SchoolMemberDashboard
        schoolId={school.id}
        fallback={<SchoolVisitorHome school={school} publicEvents={publicEvents} />}
      />
    </SchoolPageShell>
  )
}
