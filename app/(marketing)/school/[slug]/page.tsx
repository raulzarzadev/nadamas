import SchoolPublicActions from '@comps/school/SchoolPublicActions'
import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'
import { FiArrowUpRight, FiCalendar, FiClock, FiMapPin, FiUser, FiUsers } from 'react-icons/fi'
import type { SchoolClassOccurrence } from '@/lib/school'
import { SCHOOL_PALETTES } from '@/lib/school'
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
  {
    id: 'alumnos',
    title: 'Alumnos',
    body: 'Forma parte de una comunidad que entrena con objetivos.',
    icon: FiUser,
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
  const publicAreas = PUBLIC_AREAS.filter((area) => {
    if (area.id === 'coaches') return school.showCoaches === true
    if (area.id === 'clases') return school.showCoachesSchedules === true
    return school.showStudents === true
  })
  const publicClasses = school.showCoachesSchedules ? await listPublicSchoolClasses(school.id) : []

  return (
    <div style={schoolTheme} className="min-h-screen bg-(--school-surface)">
      <section className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-16">
        <div
          className="overflow-hidden rounded-[2rem] border bg-white shadow-[var(--shadow-md)]"
          style={{ borderColor: 'var(--school-secondary)' }}
        >
          <div
            className="relative px-6 py-12 text-white sm:px-12 sm:py-16"
            style={{ backgroundColor: 'var(--school-primary)' }}
          >
            <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
              {school.logoUrl ? (
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-white p-2 shadow-lg sm:h-28 sm:w-28">
                  <Image
                    src={school.logoUrl}
                    alt={`Logo de ${school.name}`}
                    fill
                    sizes="112px"
                    className="object-contain"
                  />
                </div>
              ) : (
                <div
                  className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl text-4xl font-black sm:h-28 sm:w-28"
                  style={{
                    backgroundColor: 'var(--school-accent)',
                    color: 'var(--school-primary)',
                  }}
                >
                  {school.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <h1
                  className="text-6xl font-black tracking-tight text-white sm:text-8xl"
                  style={{ color: '#ffffff' }}
                >
                  {school.name}
                </h1>
              </div>
            </div>
            <p
              className="mt-8 text-right text-[0.65rem] font-bold uppercase tracking-[0.24em] opacity-70 sm:absolute sm:bottom-5 sm:right-8 sm:mt-0"
              style={{ color: 'var(--school-accent)' }}
            >
              Escuela Nadamas
            </p>
          </div>
          <div
            className="grid gap-8 px-6 py-8 sm:px-12 sm:py-10 md:grid-cols-[1fr_auto] md:items-center"
            style={{ backgroundColor: 'var(--school-surface)' }}
          >
            <div>
              <p className="max-w-3xl text-xl font-semibold leading-9 text-(--c-ocean) sm:text-2xl">
                {school.description ||
                  'Una comunidad para aprender, entrenar y disfrutar la natación.'}
              </p>
              <p className="mt-5 text-sm text-(--c-text-2)">
                Horarios y clases coordinados por la dirección de la escuela.
              </p>
            </div>
            <SchoolPublicActions schoolId={school.id} />
          </div>
        </div>

        {publicAreas.length > 0 && (
          <nav aria-label="Secciones de la escuela" className="mt-6 grid gap-4 md:grid-cols-3">
            {publicAreas.map((area) => {
              const Icon = area.icon
              return (
                <a
                  key={area.id}
                  href={`#${area.id}`}
                  className="group flex min-h-36 flex-col justify-between rounded-3xl border bg-white p-5 shadow-[var(--shadow-sm)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-md)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--school-secondary)"
                  style={{ borderColor: 'var(--school-secondary)' }}
                >
                  <span
                    className="grid h-12 w-12 place-items-center rounded-2xl"
                    style={{
                      backgroundColor: 'var(--school-accent)',
                      color: 'var(--school-primary)',
                    }}
                  >
                    <Icon aria-hidden="true" className="h-6 w-6" />
                  </span>
                  <span>
                    <span className="flex items-center gap-1 text-xl font-extrabold text-(--c-ocean)">
                      {area.title}
                      <FiArrowUpRight
                        aria-hidden="true"
                        className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      />
                    </span>
                    <span className="mt-1 block text-sm text-(--c-text-2)">{area.body}</span>
                  </span>
                </a>
              )
            })}
          </nav>
        )}

        {school.showCoachesSchedules === true && (
          <section
            id="clases"
            className="mt-6 rounded-3xl border bg-white p-5 shadow-[var(--shadow-sm)] sm:p-7"
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
                <h2 className="mt-1 text-3xl font-black text-(--c-ocean)">Clases de la escuela</h2>
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
                      className={`rounded-2xl border p-4 ${full ? 'border-(--c-border) bg-slate-50 opacity-65' : 'bg-(--school-surface)'}`}
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
                            <FiClock aria-hidden="true" /> {occurrence.startTime}–
                            {occurrence.endTime}
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
                        {occurrence.teacherIds.length ? 'Coach asignado' : 'Coach por asignar'}
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
        )}
      </section>
    </div>
  )
}
