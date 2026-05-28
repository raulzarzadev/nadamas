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
  offeringIcon,
  offeringPrice,
  offeringTypeLabel,
  resolveOfferingSchedules,
  resolveOfferings,
  scheduleIsOpen,
  startOfWeek,
} from '@/lib/coach-offerings'
import CoachMetricsOverview from './CoachMetricsOverview'
import { CoachStyleMapPreview } from './CoachRadarChart'
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
  const [showStyleModal, setShowStyleModal] = useState(false)
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
      <section className="flex flex-col gap-5">
        <header className="flex items-center gap-4">
          {heroPhoto?.url && (
            <img
              src={heroPhoto.url}
              alt="Coach"
              className="h-20 w-20 rounded-full border border-[var(--c-border)] object-cover"
            />
          )}
          <div className="flex-1">
            <VerifiedBadge verified={verified} />
          </div>
          {metrics && (
            <div className="group relative flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => setShowStyleModal(true)}
                aria-label="Ver carta de estilo — click para más detalles"
                className="rounded-[24px] p-2 transition hover:bg-[var(--c-surface)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)]"
              >
                <CoachStyleMapPreview metrics={metrics} />
              </button>
              <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--c-text-2)]">
                Carta de estilo
              </span>
              {/* Tooltip */}
              <div
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-max max-w-[14rem] -translate-x-1/2 rounded-lg bg-[var(--c-ocean)] px-3 py-2 text-center text-xs font-medium leading-snug text-white opacity-0 shadow-[var(--shadow-md)] transition-opacity group-hover:opacity-100"
              >
                Carta de estilo · click para ver más detalles
                <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[var(--c-ocean)]" />
              </div>
            </div>
          )}
        </header>

        {coach.bio && <p className="text-[var(--c-text-2)]">{coach.bio}</p>}

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
      </section>

      {/* Carta de estilo modal */}
      {metrics && showStyleModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Carta de estilo"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowStyleModal(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setShowStyleModal(false)
          }}
        >
          <div className="relative flex max-h-[min(48rem,calc(100vh-1rem))] w-full flex-col overflow-hidden rounded-t-[32px] bg-white sm:max-w-lg sm:rounded-[32px]">
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--c-border)] px-5 py-4">
              <h2 className="text-lg font-bold text-[var(--c-ocean)]">Carta de estilo</h2>
              <button
                type="button"
                onClick={() => setShowStyleModal(false)}
                aria-label="Cerrar"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--c-border)] bg-white text-xl text-[var(--c-ocean)] transition hover:bg-[var(--c-surface)]"
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              <CoachMetricsOverview metrics={metrics} showChart={false} />
            </div>
          </div>
        </div>
      )}

      {offerings.length > 0 && (
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold text-[var(--c-ocean-mid)]">Clases disponibles</h2>
            {bookingSelections.length > 0 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--c-border)] text-sm font-bold text-[var(--c-ocean)]"
                  onClick={() => setWeekStart((current) => addDays(current, -7))}
                >
                  &#8592;
                </button>
                <span className="min-w-[7rem] text-center text-xs font-semibold text-[var(--c-ocean)]">
                  Semana del{' '}
                  {weekStart.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                </span>
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--c-border)] text-sm font-bold text-[var(--c-ocean)]"
                  onClick={() => setWeekStart((current) => addDays(current, 7))}
                >
                  &#8594;
                </button>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-[var(--r-md)] border border-[var(--c-border)] bg-white">
            {(['particular', 'grupal'] as const).flatMap((groupType) => {
              const group = offerings.filter((o) => (o.groupType ?? 'particular') === groupType)
              if (group.length === 0) return []
              const showHeader = offerings.some((o) => (o.groupType ?? 'particular') !== groupType)
              return [
                showHeader ? (
                  <div
                    key={`header-${groupType}`}
                    className="border-b border-[var(--c-border)] bg-[var(--c-surface)] px-4 py-1.5"
                  >
                    <span className="text-[0.65rem] font-bold uppercase tracking-widest text-[var(--c-text-2)]">
                      {groupType === 'particular'
                        ? '\uD83D\uDC64 Particular'
                        : '\uD83D\uDC65 Grupal'}
                    </span>
                  </div>
                ) : null,
                ...group.map((offering, idx) => {
                  const offeringSelections = selectionsByOffering.get(offering.id) || []
                  const selectedKeys = selectedSlots[offering.id] || []
                  const selectedSelections = offeringSelections.filter((sel) =>
                    selectedKeys.includes(bookingSelectionKey(sel))
                  )
                  const selectionGroups = groupOfferingSelections(offeringSelections)
                  const isOpenOffering = resolveOfferingSchedules(offering).some(scheduleIsOpen)
                  const openBookingUrl = whatsappUrl(
                    coach,
                    `Hola, vi tu perfil en nadamas.app y quiero agendar ${offeringTypeLabel(offering).toLowerCase()} (${offeringContextLabel(offering).toLowerCase()}).`
                  )

                  return (
                    <div
                      key={offering.id}
                      className={`px-4 py-3 ${
                        idx < group.length - 1 || showHeader
                          ? 'border-b border-[var(--c-border)]'
                          : ''
                      }`}
                    >
                      {/* Offering header row */}
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="text-base leading-none">{offeringIcon(offering)}</span>
                        <span className="text-sm font-bold text-[var(--c-ocean)]">
                          {offeringTypeLabel(offering)}
                        </span>
                        {offeringContextLabel(offering) && (
                          <span className="text-xs text-[var(--c-text-2)]">
                            {offeringContextLabel(offering)}
                          </span>
                        )}
                        <span className="ml-auto shrink-0 text-sm font-extrabold text-[var(--c-ocean)]">
                          {offeringPrice(offering)}
                        </span>
                      </div>

                      {/* Open schedule: agendar button */}
                      {isOpenOffering && openBookingUrl && (
                        <div className="mt-2">
                          <a
                            href={openBookingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center rounded-full bg-[var(--c-aqua)] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[var(--c-aqua-strong)]"
                          >
                            Agendar
                          </a>
                        </div>
                      )}

                      {/* Fixed schedule: single horizontal scrollable row */}
                      {!isOpenOffering && selectionGroups.length > 0 && (
                        <div className="mt-2 overflow-x-auto pb-0.5">
                          <div
                            className="flex items-center gap-3"
                            style={{ minWidth: 'max-content' }}
                          >
                            {selectionGroups.map((group) => (
                              <div key={group.key} className="flex items-center gap-1">
                                <span className="w-10 text-right text-xs font-bold text-[var(--c-ocean)]">
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
                                      className={`flex h-9 w-9 flex-col items-center justify-center rounded-full border text-[10px] font-semibold leading-none transition ${
                                        isActive
                                          ? 'border-[var(--c-aqua)] bg-[var(--c-aqua)] text-white'
                                          : 'border-[var(--c-border)] text-[var(--c-ocean)] hover:border-[var(--c-aqua)]'
                                      }`}
                                    >
                                      <span>{(selection.days[0] ?? '').slice(0, 2)}</span>
                                      <span className="text-[9px]">
                                        {new Date(`${selection.date}T12:00:00`).getDate()}
                                      </span>
                                    </button>
                                  )
                                })}
                              </div>
                            ))}
                            {selectedSelections.length > 0 && (
                              <Link
                                href={buildCoachBookingTarget(selectedSelections)}
                                className="shrink-0 rounded-full bg-[var(--c-aqua)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--c-aqua-strong)]"
                              >
                                Agendar{' '}
                                {selectedSelections.length === 1
                                  ? 'clase'
                                  : `${selectedSelections.length} clases`}
                              </Link>
                            )}
                          </div>
                        </div>
                      )}

                      {!isOpenOffering && selectionGroups.length === 0 && (
                        <p className="mt-1 text-xs text-[var(--c-text-2)]">
                          Sin horarios esta semana.
                        </p>
                      )}
                    </div>
                  )
                }),
              ]
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
