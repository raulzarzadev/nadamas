import SchoolPublicActions from '@comps/school/SchoolPublicActions'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'
import { FiArrowUpRight, FiCalendar, FiClock, FiMapPin, FiUser, FiUsers } from 'react-icons/fi'
import type { SchoolClassOccurrence } from '@/lib/school'
import { capitalizeSchoolTerm, SCHOOL_PALETTES, schoolTerminologyLabels } from '@/lib/school'
import { listPublicSchoolClasses } from '@/lib/server/school-classes'
import { getSchoolBySlug } from '@/lib/server/schools'
import { getTenantSchool } from '@/lib/server/tenant-school'

interface SchoolPublicPageProps {
  params: Promise<{ slug: string }>
}

const PUBLIC_AREAS = [
  {
    id: 'coaches',
    title: 'Entrenadores',
    body: 'Conoce al equipo que acompaña cada entrenamiento.',
    icon: FiUsers,
  },
  {
    id: 'clases',
    title: 'Horarios',
    body: 'Encuentra horarios y modalidades para tu próximo entrenamiento.',
    icon: FiCalendar,
  },
]

function publicDateLabel(occurrence: SchoolClassOccurrence) {
  return new Date(`${occurrence.date}T12:00:00`).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export async function generateMetadata({ params }: SchoolPublicPageProps): Promise<Metadata> {
  const { slug } = await params
  const school = await getSchoolBySlug(slug)
  if (!school) return { title: 'Escuela no disponible' }
  return {
    title: (await getTenantSchool()) ? { absolute: school.name } : school.name,
    description: school.description || `Conoce ${school.name} en Nadamas.`,
    openGraph: {
      title: school.name,
      description: school.description || `Conoce ${school.name} en Nadamas.`,
      images: school.logoUrl ? [{ url: school.logoUrl, alt: school.name }] : undefined,
    },
  }
}

export default async function SchoolPublicPage({ params }: SchoolPublicPageProps) {
  const { slug } = await params
  const school = await getSchoolBySlug(slug)
  if (!school?.isPublic) notFound()

  const palette =
    SCHOOL_PALETTES.find((option) => option.value === school.palette) || SCHOOL_PALETTES[0]
  const schoolTheme = {
    '--school-primary': palette.primary,
    '--school-secondary': palette.secondary,
    '--school-accent': palette.accent,
    '--school-surface': palette.surface,
  } as CSSProperties
  const terminology = schoolTerminologyLabels(school.terminology)
  const publicAreas = PUBLIC_AREAS.map((area) =>
    area.id === 'coaches' ? { ...area, title: capitalizeSchoolTerm(terminology.coachPlural) } : area
  )
  const publicClasses = await listPublicSchoolClasses(school.id)

  return (
    <div style={schoolTheme} className="min-h-screen bg-(--school-surface)">
      <section className="mx-auto max-w-5xl px-5 pb-12 pt-12 sm:px-8 sm:pb-16 sm:pt-16">
        <div
          className="flex flex-col gap-6 border-b pb-9 sm:flex-row sm:items-end sm:justify-between sm:pb-10"
          style={{ borderColor: 'var(--school-secondary)' }}
        >
          <div className="max-w-3xl">
            <p
              className="text-xs font-bold uppercase tracking-[0.2em]"
              style={{ color: 'var(--school-primary)' }}
            >
              Escuela de natación
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-(--c-ocean) sm:text-6xl">
              {school.name}
            </h1>
            <p className="mt-4 text-lg leading-8 text-(--c-text-2) sm:text-xl">
              {school.description ||
                'Una comunidad para aprender, entrenar y disfrutar la natación.'}
            </p>
          </div>
          <SchoolPublicActions schoolId={school.id} />
        </div>

        {publicAreas.length > 0 && (
          <nav aria-label="Secciones de la escuela" className="mt-4 flex flex-wrap gap-3">
            {publicAreas.map((area) => {
              const Icon = area.icon
              return (
                <a
                  key={area.id}
                  href={`#${area.id}`}
                  className="group flex min-h-12 items-center gap-2 rounded-full border bg-white px-4 py-2 transition hover:bg-(--school-surface) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--school-secondary)"
                  style={{ borderColor: 'var(--school-secondary)' }}
                >
                  <span
                    className="grid size-8 place-items-center rounded-full"
                    style={{
                      backgroundColor: 'var(--school-accent)',
                      color: 'var(--school-primary)',
                    }}
                  >
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  <span>
                    <span className="flex items-center gap-1 text-sm font-bold text-(--c-ocean)">
                      {area.title}
                      <FiArrowUpRight
                        aria-hidden="true"
                        className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      />
                    </span>
                    <span className="sr-only">{area.body}</span>
                  </span>
                </a>
              )
            })}
          </nav>
        )}

        <section
          id="clases"
          className="mt-5 rounded-2xl border bg-white p-5 sm:p-7"
          style={{ borderColor: 'var(--school-secondary)' }}
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p
                className="text-xs font-bold uppercase tracking-[0.2em]"
                style={{ color: 'var(--school-secondary)' }}
              >
                Horarios
              </p>
              <h2 className="mt-1 text-2xl font-black text-(--c-ocean) sm:text-3xl">
                Horarios disponibles
              </h2>
            </div>
            <p className="text-sm text-(--c-text-2)">Horarios publicados por la escuela</p>
          </div>
          {publicClasses.length ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {publicClasses.map((occurrence) => {
                const occupied = occurrence.studentIds.length > 0
                const full = occurrence.type === 'individual' && occupied
                return (
                  <article
                    key={occurrence.id}
                    className={`rounded-xl border p-4 ${full ? 'border-(--c-border) bg-slate-50 opacity-65' : 'bg-(--school-surface)'}`}
                    style={{ borderColor: full ? undefined : 'var(--school-secondary)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className={full ? 'line-through' : ''}>
                        <h3 className="font-extrabold text-(--c-ocean)">{occurrence.title}</h3>
                        <p className="mt-1 text-xs font-bold uppercase tracking-wide text-(--c-text-2)">
                          {occurrence.type === 'group' ? 'Grupal' : 'Particular'}
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-sm text-(--c-text-2)">
                          <FiCalendar aria-hidden="true" /> {publicDateLabel(occurrence)}
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-sm text-(--c-text-2)">
                          <FiClock aria-hidden="true" /> {occurrence.startTime}–{occurrence.endTime}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${full ? 'bg-slate-200 text-slate-600' : 'bg-(--school-accent) text-(--school-primary)'}`}
                      >
                        {full
                          ? 'Ocupado'
                          : occurrence.type === 'group' && occupied
                            ? `${occurrence.studentIds.length} inscrito${occurrence.studentIds.length === 1 ? '' : 's'}`
                            : 'Disponible'}
                      </span>
                    </div>
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-(--c-text-2)">
                      <FiUser aria-hidden="true" />
                      {occurrence.teacherIds.length
                        ? `${capitalizeSchoolTerm(terminology.coachSingular)} asignado`
                        : `${capitalizeSchoolTerm(terminology.coachSingular)} por asignar`}
                    </p>
                    {occurrence.location && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-(--c-text-2)">
                        <FiMapPin aria-hidden="true" /> {occurrence.location}
                      </p>
                    )}
                  </article>
                )
              })}
            </div>
          ) : (
            <p className="mt-5 rounded-2xl bg-(--school-surface) p-5 text-sm text-(--c-text-2)">
              La escuela todavía no ha publicado horarios.
            </p>
          )}
        </section>
      </section>
    </div>
  )
}
