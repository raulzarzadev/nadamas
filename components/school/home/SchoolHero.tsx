import Image from 'next/image'
import type { ReactNode } from 'react'

export interface SchoolHeroSchool {
  name: string
  description: string
  logoUrl?: string | null
  coverUrl?: string | null
}

const DEFAULT_DESCRIPTION = 'Una comunidad para aprender, entrenar y disfrutar la natación.'

function SchoolBadge({ school }: { school: SchoolHeroSchool }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white/90">
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
  )
}

function LaneArt() {
  return (
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
                    backgroundColor: lane % 2 ? 'var(--school-secondary)' : 'var(--school-accent)',
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
  )
}

/**
 * School hero. `large` is the visitor view; `small` is the member dashboard header.
 * `greetingName` (member only): `''` renders just "Hola".
 */
export default function SchoolHero({
  school,
  size,
  greetingName,
  children,
}: {
  school: SchoolHeroSchool
  size: 'large' | 'small'
  greetingName?: string
  children?: ReactNode
}) {
  const large = size === 'large'
  return (
    <section
      aria-labelledby="school-title"
      className="relative isolate overflow-hidden rounded-none bg-(--school-primary) text-white sm:rounded-[2rem]"
      style={{
        backgroundImage:
          'radial-gradient(ellipse at 80% 0%, color-mix(in srgb, var(--school-secondary) 55%, transparent), transparent 44%)',
      }}
    >
      {school.coverUrl && (
        <>
          {/* biome-ignore lint/performance/noImgElement: remote storage cover */}
          <img
            src={school.coverUrl}
            alt=""
            className="absolute inset-0 -z-20 size-full object-cover"
          />
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-black/55" />
        </>
      )}
      {large ? (
        <div className="grid min-h-[28rem] items-center gap-6 px-4 py-6 sm:gap-10 sm:px-12 sm:py-14 lg:grid-cols-[1.1fr_0.9fr] lg:px-16">
          <div className="relative z-10 min-w-0 max-w-2xl">
            <div className="mb-5 sm:mb-8">
              <SchoolBadge school={school} />
            </div>
            <h1
              id="school-title"
              className="max-w-xl break-words text-5xl font-black leading-[0.98] tracking-tight text-white sm:text-7xl"
              style={{ color: 'white' }}
            >
              {school.name}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/80 sm:text-xl">
              {school.description || DEFAULT_DESCRIPTION}
            </p>
            {children && (
              <div className="mt-6 flex flex-wrap items-center gap-3 sm:mt-9">{children}</div>
            )}
          </div>
          {!school.coverUrl && <LaneArt />}
        </div>
      ) : (
        <div className="relative z-10 px-4 py-5 sm:px-10 sm:py-8">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-white/85">
            {greetingName ? `Hola, ${greetingName}` : 'Hola'}
          </p>
          <h1
            id="school-title"
            className="mt-1 break-words text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl"
            style={{ color: 'white' }}
          >
            {school.name}
          </h1>
          {children && <div className="mt-4 flex flex-wrap items-center gap-3">{children}</div>}
        </div>
      )}
    </section>
  )
}
