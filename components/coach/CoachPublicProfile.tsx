'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { CoachPublic } from '@/firebase/coaches/coach.model'
import {
  bookingSelectionKey,
  buildCoachBookingTarget,
  type CoachBookingSelection,
  flattenCoachBookingSelections,
} from '@/lib/coach-booking'
import { normalizeCoachMetrics } from '@/lib/coach-metrics'
import {
  addDays,
  offeringContextLabel,
  offeringTypeLabel,
  resolveOfferingSchedules,
  resolveOfferings,
  scheduleIsOpen,
  startOfWeek,
} from '@/lib/coach-offerings'
import CoachMetricsOverview from './CoachMetricsOverview'
import CoachRadarChart from './CoachRadarChart'
import OfferingSummaryCard from './OfferingSummaryCard'
import VerifiedBadge from './VerifiedBadge'

function groupOfferingSelections(selections: CoachBookingSelection[]) {
  const groups = new Map<
    string,
    {
      key: string
      startTime: string
      selections: CoachBookingSelection[]
    }
  >()

  for (const selection of selections) {
    const key = [selection.scheduleId, selection.startTime, selection.endTime].join('::')
    const group = groups.get(key)
    if (group) {
      group.selections.push(selection)
      continue
    }
    groups.set(key, {
      key,
      startTime: selection.startTime,
      selections: [selection],
    })
  }

  return [...groups.values()]
}

function whatsappUrl(coach: CoachPublic, message: string) {
  const link = coach.publicLinks?.find((item) => item.kind === 'whatsapp')
  if (!link?.value) return null
  const phone = link.value.replace(/\D/g, '')
  if (!phone) return null
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

export default function CoachPublicProfile({ coach }: { coach: CoachPublic }) {
  const [showStyleDetails, setShowStyleDetails] = useState(false)
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [selectedSlots, setSelectedSlots] = useState<Record<string, string[]>>({})
  const verified = coach.verification?.status === 'verified'
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
  const bookingSelections = useMemo(
    () =>
      coach.id
        ? flattenCoachBookingSelections({ ...coach, id: coach.id }, weekStart)
        : ([] as CoachBookingSelection[]),
    [coach, weekStart]
  )
  const selectionsByOffering = useMemo(() => {
    const grouped = new Map<string, CoachBookingSelection[]>()
    for (const selection of bookingSelections) {
      grouped.set(selection.offeringId, [...(grouped.get(selection.offeringId) || []), selection])
    }
    return grouped
  }, [bookingSelections])

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        <div className="flex flex-col gap-5">
          <header className="flex items-center gap-4">
            {heroPhoto?.url && (
              <img
                src={heroPhoto.url}
                alt="Coach"
                className="h-20 w-20 rounded-full border border-[var(--c-border)] object-cover"
              />
            )}
            <div>
              <VerifiedBadge verified={verified} />
            </div>
          </header>

          {coach.bio && <p className="text-[var(--c-text-2)]">{coach.bio}</p>}

          {metrics && (
            <button
              type="button"
              onClick={() => setShowStyleDetails((value) => !value)}
              className="self-start rounded-full border border-[var(--c-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--c-ocean)] transition hover:border-[var(--c-aqua)]"
            >
              {showStyleDetails
                ? 'Ocultar detalles de carta de estilo'
                : 'Ver detalles de carta de estilo'}
            </button>
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
        </div>

        {metrics && (
          <div className="lg:sticky lg:top-24">
            <CoachRadarChart metrics={metrics} />
          </div>
        )}
      </section>

      {metrics && showStyleDetails && (
        <section className="flex flex-col gap-3">
          <CoachMetricsOverview metrics={metrics} showChart={false} />
        </section>
      )}

      {offerings.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-[var(--c-ocean-mid)]">Clases</h2>
            {bookingSelections.length > 0 && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="rounded-full border border-[var(--c-border)] bg-white px-3 py-1 text-sm font-semibold text-[var(--c-ocean)]"
                  onClick={() => setWeekStart((current) => addDays(current, -7))}
                >
                  ←
                </button>
                <p className="text-sm font-semibold text-[var(--c-ocean)]">
                  Semana del{' '}
                  {weekStart.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                </p>
                <button
                  type="button"
                  className="rounded-full border border-[var(--c-border)] bg-white px-3 py-1 text-sm font-semibold text-[var(--c-ocean)]"
                  onClick={() => setWeekStart((current) => addDays(current, 7))}
                >
                  →
                </button>
              </div>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {offerings.map((offering) => {
              const offeringSelections = selectionsByOffering.get(offering.id) || []
              const selectedKeys = selectedSlots[offering.id] || []
              const selectedSelections = offeringSelections.filter((selection) =>
                selectedKeys.includes(bookingSelectionKey(selection))
              )
              const selectionGroups = groupOfferingSelections(offeringSelections)
              const isOpenOffering = resolveOfferingSchedules(offering).some(scheduleIsOpen)
              const openBookingUrl = whatsappUrl(
                coach,
                `Hola, vi tu perfil en nadamas.app y quiero agendar ${offeringTypeLabel(offering).toLowerCase()} (${offeringContextLabel(offering).toLowerCase()}).`
              )

              return (
                <OfferingSummaryCard
                  key={offering.id}
                  offering={offering}
                  openDescription="Acuerda día y hora con el coach."
                  showImage
                  showLocationLink
                >
                  {isOpenOffering && (
                    <div className="mt-4 flex flex-col gap-4">
                      {offering.details && (
                        <p className="text-center text-sm leading-relaxed text-[var(--c-text-2)]">
                          {offering.details}
                        </p>
                      )}
                      {openBookingUrl ? (
                        <a
                          href={openBookingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex w-fit self-end rounded-full bg-[var(--c-aqua)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--c-aqua-strong)]"
                        >
                          Agendar
                        </a>
                      ) : (
                        <p className="text-xs text-[var(--c-text-2)]">
                          Este coach no tiene un contacto público para agendar horario abierto.
                        </p>
                      )}
                    </div>
                  )}

                  {!isOpenOffering && selectionGroups.length > 0 && (
                    <div className="mt-3 flex flex-col gap-3">
                      {selectionGroups.map((group) => (
                        <div key={group.key} className="flex flex-wrap items-center gap-2">
                          <span className="min-w-12 font-bold text-[var(--c-ocean)]">
                            {group.startTime}
                          </span>
                          {group.selections.map((selection) => {
                            const key = bookingSelectionKey(selection)
                            const isActive = selectedKeys.includes(key)
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() =>
                                  setSelectedSlots((current) => ({
                                    ...current,
                                    [offering.id]: isActive
                                      ? selectedKeys.filter((item) => item !== key)
                                      : [...selectedKeys, key],
                                  }))
                                }
                                className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                                  isActive
                                    ? 'border-[var(--c-aqua)] bg-[var(--c-aqua-light)] text-[var(--c-ocean)]'
                                    : 'border-[var(--c-border)] bg-[var(--c-surface)] text-[var(--c-ocean)] hover:border-[var(--c-aqua)]'
                                }`}
                              >
                                <span className="block">{selection.days[0]}</span>
                                <span className="block text-xs font-medium">
                                  {new Date(`${selection.date}T12:00:00`).getDate()}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      ))}

                      {selectedSelections.length > 0 ? (
                        <Link
                          href={buildCoachBookingTarget(selectedSelections)}
                          className="inline-flex w-fit items-center justify-center rounded-full bg-[var(--c-aqua)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--c-aqua-strong)]"
                        >
                          Agendar {selectedSelections.length === 1 ? 'clase' : 'clases'}
                        </Link>
                      ) : (
                        <p className="text-xs text-[var(--c-text-2)]">
                          Selecciona una fecha para agendar.
                        </p>
                      )}
                    </div>
                  )}
                </OfferingSummaryCard>
              )
            })}
          </div>
        </section>
      )}

      {galleryPhotos.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold text-[var(--c-ocean-mid)]">Galería</h2>
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
        </section>
      )}
    </div>
  )
}
