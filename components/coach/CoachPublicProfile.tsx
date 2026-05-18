import type { CoachPublic } from '@/firebase/coaches/coach.model'
import { normalizeCoachMetrics } from '@/lib/coach-metrics'
import {
  offeringHeadline,
  offeringPrice,
  offeringWhen,
  resolveOfferings,
} from '@/lib/coach-offerings'
import { effectiveScore } from '@/lib/coach-score'
import CoachMetricsOverview from './CoachMetricsOverview'

export default function CoachPublicProfile({ coach }: { coach: CoachPublic }) {
  const verified = coach.verification?.status === 'verified'
  const score = effectiveScore(coach.verification)
  const galleryPhotos = coach.galleryPhotos?.length
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
  const heroPhoto = galleryPhotos.find((photo) => photo.label === 'Yo') ?? galleryPhotos[0]
  const metrics = coach.metrics ? normalizeCoachMetrics(coach.metrics) : null
  const offerings = resolveOfferings(coach)

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-4">
        {heroPhoto?.url && (
          <img
            src={heroPhoto.url}
            alt="Coach"
            className="h-20 w-20 rounded-full border border-[var(--c-border)] object-cover"
          />
        )}
        <div>
          <p className="text-3xl font-extrabold text-[var(--c-ocean)]">
            {score}
            <span className="text-base font-medium text-[var(--c-text-2)]"> / 100</span>
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

      {coach.bio && <p className="text-[var(--c-text-2)]">{coach.bio}</p>}

      {metrics && <CoachMetricsOverview metrics={metrics} />}

      {galleryPhotos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {galleryPhotos.map((p) => (
            <figure
              key={p.url}
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
          {coach.publicLinks.map((link) => (
            <li key={link.kind + link.value}>
              <a
                href={
                  link.kind === 'whatsapp'
                    ? `https://wa.me/${link.value.replace(/\D/g, '')}`
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

      {offerings.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold text-[var(--c-ocean-mid)]">Clases</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {offerings.map((offering) => (
              <article
                key={offering.id}
                className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-4"
              >
                <div className="flex gap-3">
                  {offering.imageUrl && (
                    <img
                      src={offering.imageUrl}
                      alt={offering.placeName || 'Lugar de clases'}
                      className="h-20 w-20 rounded-[var(--r-sm)] object-cover"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-[var(--c-ocean)]">{offeringHeadline(offering)}</p>
                    <p className="mt-1 text-sm text-[var(--c-text-2)]">{offeringWhen(offering)}</p>
                    <p className="mt-1 text-sm font-bold text-[var(--c-ocean)]">
                      {offeringPrice(offering)}
                    </p>
                    {offering.locationUrl && (
                      <a
                        href={offering.locationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-sm font-semibold text-[var(--c-aqua-strong)] underline"
                      >
                        Ver ubicación
                      </a>
                    )}
                    {offering.details && (
                      <p className="mt-1 text-sm text-[var(--c-text-2)]">{offering.details}</p>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
