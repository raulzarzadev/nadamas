import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'
import { FiArrowRight } from 'react-icons/fi'
import SchoolPublicContacts from '@/components/school/SchoolPublicContacts'
import { SCHOOL_PALETTES } from '@/lib/school'
import { visibleSchoolContacts } from '@/lib/school-contact'
import { getSchoolBySlug } from '@/lib/server/schools'
import { getTenantSchool } from '@/lib/server/tenant-school'

interface SchoolPublicPageProps {
  params: Promise<{ slug: string }>
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

  return (
    <div style={schoolTheme} className="min-h-screen bg-(--school-surface)">
      <div className="mx-auto max-w-7xl px-5 pb-16 pt-7 sm:px-8 sm:pt-10">
        <section
          aria-labelledby="school-title"
          className="relative isolate overflow-hidden rounded-[2rem] bg-(--school-primary) text-white"
          style={{
            backgroundImage:
              'radial-gradient(ellipse at 80% 0%, color-mix(in srgb, var(--school-secondary) 55%, transparent), transparent 44%)',
          }}
        >
          <div className="grid min-h-[28rem] items-center gap-10 px-7 py-10 sm:px-12 sm:py-14 lg:grid-cols-[1.1fr_0.9fr] lg:px-16">
            <div className="relative z-10 max-w-2xl">
              <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white/90">
                {school.logoUrl ? (
                  <Image
                    src={school.logoUrl}
                    alt=""
                    width={28}
                    height={28}
                    className="size-7 rounded-full object-cover"
                  />
                ) : (
                  <span
                    className="grid size-7 place-items-center rounded-full bg-white text-sm font-black"
                    style={{ color: 'var(--school-primary)' }}
                  >
                    {school.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                Escuela de natación
              </div>
              <h1
                id="school-title"
                className="max-w-xl text-5xl font-black leading-[0.98] tracking-tight text-white sm:text-7xl"
                style={{ color: 'white' }}
              >
                {school.name}
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-white/80 sm:text-xl">
                {school.description ||
                  'Una comunidad para aprender, entrenar y disfrutar la natación.'}
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href="/athlete/find-coach"
                  className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 font-bold transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                  style={{ color: 'var(--school-primary)' }}
                >
                  Explorar horarios <FiArrowRight aria-hidden="true" />
                </Link>
                <Link
                  href="/athlete/progress"
                  className="btn min-h-12 border-0 px-7 text-white"
                  style={{ backgroundColor: 'var(--school-primary)' }}
                >
                  Ver mi progreso
                </Link>
              </div>
            </div>
            <div
              aria-hidden="true"
              className="relative mx-auto hidden aspect-[4/3] w-full max-w-lg lg:block"
            >
              <div className="absolute inset-0 rotate-[-8deg] rounded-[2.5rem] border border-white/15 bg-white/[0.06]" />
              <div className="absolute inset-[9%] rotate-[5deg] overflow-hidden rounded-[2rem] border border-white/15 bg-black/10 p-5">
                <div className="flex h-full flex-col justify-between rounded-[1.5rem] border border-white/15 bg-white/[0.04] p-5">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.18em] text-white/60">
                    <span>En el agua</span>
                    <span>01 / 04</span>
                  </div>
                  <div className="space-y-3">
                    {[0, 1, 2, 3].map((lane) => (
                      <div
                        key={lane}
                        className="relative h-10 overflow-hidden rounded-full border border-white/20 bg-white/[0.06]"
                      >
                        <span
                          className="absolute inset-y-0 left-0 w-[58%] rounded-full opacity-80"
                          style={{
                            backgroundColor:
                              lane % 2 ? 'var(--school-secondary)' : 'var(--school-accent)',
                          }}
                        />
                        <span className="absolute inset-y-0 left-[58%] border-l border-dashed border-white/60" />
                        <span className="absolute right-4 top-1/2 size-2 -translate-y-1/2 rounded-full bg-white/80" />
                      </div>
                    ))}
                  </div>
                  <p className="text-sm font-semibold text-white/80">Cada brazada cuenta.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <SchoolPublicContacts
          schoolId={school.id}
          initialContacts={visibleSchoolContacts(school.contacts)}
        />
      </div>
    </div>
  )
}
