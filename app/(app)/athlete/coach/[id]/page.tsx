'use client'
import { use, useEffect, useState } from 'react'
import { CoachCRUD } from '@/firebase/coaches/main'
import { effectiveScore } from '@/lib/coach-score'
import type { CoachPublic } from '@/firebase/coaches/coach.model'
import CoachRadarChart from '@comps/coach/CoachRadarChart'
import { COACH_METRICS, normalizeCoachMetrics } from '@/lib/coach-metrics'
import Loading from '@comps/Loading'

export default function AthleteCoachView({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [coach, setCoach] = useState<CoachPublic | null | undefined>(undefined)

  useEffect(() => {
    const unsub = CoachCRUD.listenPublic(id, setCoach)
    return () => {
      unsub && unsub()
    }
  }, [id])

  if (coach === undefined) return <Loading />
  if (coach === null) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-extrabold">Coach</h1>
        <div className="rounded-[var(--r-md)] bg-[var(--c-surface)] border border-[var(--c-border)] p-10 text-center text-[var(--c-text-2)]">
          Perfil no disponible
        </div>
      </div>
    )
  }

  const verified = coach.verification?.status === 'verified'
  const score = effectiveScore(coach.verification)
  const galleryPhotos =
    coach.galleryPhotos?.length
      ? coach.galleryPhotos
      : [
          ...(coach.facePhoto ? [{ ...coach.facePhoto, label: 'Yo' }] : []),
          ...(coach.workplacePhotos || []).map((photo) => ({
            ...photo,
            label: 'Lugares de trabajo',
          })),
          ...(coach.achievementPhotos || []).map((photo) => ({
            ...photo,
            label: 'Logros y eventos',
          })),
        ]
  const heroPhoto =
    galleryPhotos.find((photo) => photo.label === 'Yo') ?? galleryPhotos[0]
  const metrics = coach.metrics ? normalizeCoachMetrics(coach.metrics) : null

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-4">
        {heroPhoto?.url && (
          <img
            src={heroPhoto.url}
            alt="Coach"
            className="w-20 h-20 object-cover rounded-full border border-[var(--c-border)]"
          />
        )}
        <div>
          <p className="text-3xl font-extrabold text-[var(--c-ocean)]">
            {score}
            <span className="text-base font-medium text-[var(--c-text-2)]">
              {' '}
              / 100
            </span>
          </p>
          <span
            className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${
              verified
                ? 'bg-[var(--c-aqua-light)] text-[var(--c-ocean)]'
                : 'bg-[var(--c-surface)] text-[var(--c-text-2)]'
            }`}
          >
            {verified ? 'Verificado' : 'Pendiente de verificación'}
          </span>
        </div>
      </header>

      {coach.bio && (
        <p className="text-[var(--c-text-2)]">{coach.bio}</p>
      )}

      {metrics && (
        <section className="grid gap-4 lg:grid-cols-[19rem_1fr] lg:items-start">
          <CoachRadarChart metrics={metrics} />
          <div className="grid gap-3 sm:grid-cols-2">
            {COACH_METRICS.map((metric) => (
              <div
                key={metric.key}
                className="rounded-[var(--r-sm)] border border-[var(--c-border)] bg-white p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-[var(--c-ocean)]">
                    {metric.label}
                  </span>
                  <span className="rounded-full bg-[var(--c-surface)] px-2 py-0.5 text-sm font-bold text-[var(--c-ocean-mid)]">
                    {metrics[metric.key]}/5
                  </span>
                </div>
                <div className="mt-2 flex justify-between text-sm text-[var(--c-text-2)]">
                  <span>{metric.minLabel}</span>
                  <span>{metric.maxLabel}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {galleryPhotos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {galleryPhotos.map((p, i) => (
            <figure
              key={p.url + i}
              className="overflow-hidden rounded-[var(--r-md)] border border-[var(--c-border)] bg-white"
            >
              <img
                src={p.url}
                alt={p.label || 'Galería del coach'}
                className="aspect-square w-full object-cover"
              />
              {p.label && (
                <figcaption className="px-3 py-2 text-sm text-[var(--c-text-2)]">
                  {p.label}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      )}

      {!!coach.publicLinks?.length && (
        <ul className="flex flex-wrap gap-3">
          {coach.publicLinks.map((link, i) => (
            <li key={link.kind + link.value + i}>
              <a
                href={
                  link.kind === 'whatsapp'
                    ? `https://wa.me/${link.value.replace(/\\D/g, '')}`
                    : link.value.startsWith('http')
                      ? link.value
                      : `https://${link.value}`
                }
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-1 text-sm font-semibold text-[var(--c-aqua-strong)]"
              >
                {link.kind}
              </a>
            </li>
          ))}
        </ul>
      )}

      {!!coach.teachingLocations?.length && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold text-[var(--c-ocean-mid)]">
            Horarios y lugares
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {coach.teachingLocations.map((location) => (
              <article
                key={location.id}
                className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-4"
              >
                <div className="flex gap-3">
                  {location.imageUrl && (
                    <img
                      src={location.imageUrl}
                      alt={location.name}
                      className="h-20 w-20 rounded-[var(--r-sm)] object-cover"
                    />
                  )}
                  <div>
                    <p className="font-bold text-[var(--c-ocean)]">
                      {location.name || 'Lugar por definir'}
                    </p>
                    {location.locationUrl && (
                      <a
                        href={location.locationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-semibold text-[var(--c-aqua-strong)] underline"
                      >
                        Ver ubicación
                      </a>
                    )}
                  </div>
                </div>
                <ul className="mt-3 flex flex-col gap-1 text-sm text-[var(--c-text-2)]">
                  {location.availability.map((slot, index) => (
                    <li key={`${location.id}-${index}`}>
                      {slot.days.join(', ')} · {slot.startTime}–{slot.endTime}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      )}

      {!!coach.priceOptions?.length && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold text-[var(--c-ocean-mid)]">
            Precios
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {coach.priceOptions.map((option) => (
              <article
                key={option.id}
                className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-[var(--c-ocean)]">
                      {option.title || 'Clase'}
                    </p>
                    {!!option.durationMinutes && (
                      <p className="text-sm text-[var(--c-text-2)]">
                        {option.durationMinutes} min
                      </p>
                    )}
                  </div>
                  <p className="text-lg font-extrabold text-[var(--c-ocean)]">
                    {option.amount !== null ? `$${option.amount}` : '—'}
                  </p>
                </div>
                <p className="mt-2 text-sm text-[var(--c-text-2)]">
                  Por {option.unit}
                </p>
                {option.details && (
                  <p className="mt-2 text-sm text-[var(--c-text-2)]">
                    {option.details}
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
