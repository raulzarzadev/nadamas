'use client'

import CoachMetricsOverview from '@comps/coach/CoachMetricsOverview'
import { CoachStyleMapPreview } from '@comps/coach/CoachRadarChart'
import IconInfo from '@comps/IconInfo'
import PreviewImage from '@comps/PreviewImage'
import { onAuthStateChanged } from 'firebase/auth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CARD_PROPIERTIES_AND_STYLES_LABEL } from '@/CONSTANTS/LABELS'
import type { CoachPublic } from '@/firebase/coaches/coach.model'
import { auth } from '@/firebase/index'
import {
  bookingSelectionKey,
  buildCoachBookingTarget,
  type CoachBookingSelection,
  flattenCoachBookingSelections,
} from '@/lib/coach-booking'
import { normalizeCoachMetrics } from '@/lib/coach-metrics'
import {
  addDays,
  formatPesos,
  offeringsAvailabilitySummary,
  offeringsPriceSummary,
  resolveOfferings,
  startOfWeek,
} from '@/lib/coach-offerings'

interface PublicCoachDirectoryItem extends CoachPublic {
  id: string
  name: string
  avatarUrl?: string
}

interface MarketplacePreviewProps {
  initialVisibleCount?: number
  pageSize?: number
  infiniteScroll?: boolean
  showViewMoreLink?: boolean
}

const UNIT_LABEL: Record<CoachBookingSelection['unit'], string> = {
  clase: 'por clase',
  sesión: 'por sesión',
  mes: 'por mes',
  paquete: 'por paquete',
}

function coachPhoto(coach: PublicCoachDirectoryItem) {
  return (
    coach.facePhoto?.url ||
    coach.galleryPhotos?.find((photo) => photo.label === 'Yo')?.url ||
    coach.avatarUrl ||
    null
  )
}

function availabilitySummary(coach: PublicCoachDirectoryItem) {
  return offeringsAvailabilitySummary(resolveOfferings(coach))
}

function priceSummary(coach: PublicCoachDirectoryItem) {
  return offeringsPriceSummary(resolveOfferings(coach))
}

function groupSelections(selections: CoachBookingSelection[]) {
  const groups = new Map<
    string,
    {
      key: string
      locationName: string
      mode: CoachBookingSelection['mode']
      startTime: string
      selections: CoachBookingSelection[]
    }
  >()

  for (const selection of selections) {
    const key = [selection.offeringId, selection.scheduleId].join('::')
    const group = groups.get(key)
    if (group) {
      group.selections.push(selection)
      continue
    }
    groups.set(key, {
      key,
      locationName: selection.locationName,
      mode: selection.mode,
      startTime: selection.startTime,
      selections: [selection],
    })
  }

  return [...groups.values()]
}

export default function MarketplacePreview({
  initialVisibleCount,
  pageSize = 12,
  infiniteScroll = false,
  showViewMoreLink = false,
}: MarketplacePreviewProps) {
  const router = useRouter()
  const [coaches, setCoaches] = useState<PublicCoachDirectoryItem[]>([])
  const [query, setQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [styleCoach, setStyleCoach] = useState<PublicCoachDirectoryItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [selectedSlots, setSelectedSlots] = useState<Record<string, string[]>>({})
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [bookingState] = useState<
    Record<
      string,
      {
        status: 'idle' | 'loading' | 'success' | 'error'
        message?: string
      }
    >
  >({})
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const startingVisibleCount =
    initialVisibleCount ?? (infiniteScroll ? pageSize : Number.POSITIVE_INFINITY)
  const [visibleCount, setVisibleCount] = useState(startingVisibleCount)

  useEffect(() => {
    async function loadCoaches() {
      try {
        const response = await fetch('/api/public/coaches')
        const payload = (await response.json()) as {
          coaches?: PublicCoachDirectoryItem[]
        }
        setCoaches(payload.coaches || [])
      } finally {
        setIsLoading(false)
      }
    }

    void loadCoaches()
  }, [])

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setCurrentUserId(user?.uid || null)
    })
  }, [])

  useEffect(() => {
    if (!styleCoach) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setStyleCoach(null)
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [styleCoach])

  const visibleCoaches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return coaches
    return coaches.filter((coach) => coach.name.toLowerCase().includes(normalizedQuery))
  }, [coaches, query])
  const renderedCoaches = visibleCoaches.slice(0, visibleCount)
  const hasMoreCoaches = renderedCoaches.length < visibleCoaches.length

  useEffect(() => {
    setVisibleCount(startingVisibleCount)
  }, [startingVisibleCount])

  useEffect(() => {
    if (!infiniteScroll || !hasMoreCoaches) return

    const target = loadMoreRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisibleCount((current) => Math.min(current + pageSize, visibleCoaches.length))
        }
      },
      { rootMargin: '240px 0px' }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [hasMoreCoaches, infiniteScroll, pageSize, visibleCoaches.length])

  const scheduleSelection = (selections: CoachBookingSelection[]) => {
    if (!selections.length) return
    const sessionUserId = currentUserId || auth.currentUser?.uid || null
    const target = buildCoachBookingTarget(selections)

    if (!sessionUserId) {
      router.push(`/login?redirectTo=${encodeURIComponent(target)}`)
      return
    }

    router.push(target)
  }

  return (
    <section id="coaches" className="mx-auto max-w-[1180px] px-5 py-20 sm:px-8 lg:py-28">
      <div className="reveal grid gap-6 lg:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)] lg:items-end lg:gap-10">
        <div className="">
          <h2 className="text-[2.1rem] font-extrabold sm:text-[2.9rem]">
            Encuentra un coach compatible contigo
          </h2>
          <p className="mt-4 text-lg leading-relaxed" style={{ color: 'var(--c-text-2)' }}>
            La {CARD_PROPIERTIES_AND_STYLES_LABEL} resume cómo entrena cada profe: qué tan técnico,
            paciente, planeado o conectado con el agua es. Así comparas estilos antes de reservar,
            no solo precios.
          </p>
        </div>

        <div
          className="rounded-[30px] p-4 sm:p-5 m-auto w-full"
          style={{ background: 'var(--c-surface)' }}
        >
          <label className="block">
            <span className="sr-only">Buscar coach por nombre</span>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setVisibleCount(startingVisibleCount)
              }}
              placeholder="Buscar por nombre"
              className="h-14 w-full rounded-full border border-[var(--c-border)] bg-white px-6 text-base shadow-[var(--shadow-sm)] outline-none transition focus:border-[var(--c-aqua)]"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2 text-sm" style={{ color: 'var(--c-text-2)' }}>
            {['Compara estilo', 'Revisa horarios', 'Reserva al instante'].map((item) => (
              <span
                key={item}
                className="rounded-full bg-white px-3 py-1.5"
                style={{ border: '1px solid var(--c-border)' }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="reveal mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {isLoading && (
          <div className="rounded-[32px] border border-[var(--c-border)] bg-white p-6 text-[var(--c-text-2)]">
            Cargando coaches…
          </div>
        )}

        {!isLoading && visibleCoaches.length === 0 && (
          <div className="rounded-[32px] border border-[var(--c-border)] bg-white p-6 text-[var(--c-text-2)] md:col-span-2 xl:col-span-3">
            Aún no encontramos coaches con ese nombre.
          </div>
        )}

        {renderedCoaches.map((coach) => {
          const photo = coachPhoto(coach)
          const isExpanded = expandedId === coach.id
          const metrics = normalizeCoachMetrics(coach.metrics)
          const selections = flattenCoachBookingSelections(coach, weekStart)
          const selectionGroups = groupSelections(selections)
          const selectedSlotKeys = selectedSlots[coach.id] || []
          const selectedSelections = selections.filter((selection) =>
            selectedSlotKeys.includes(bookingSelectionKey(selection))
          )
          const selectedTotal = selectedSelections.reduce(
            (total, selection) => total + (selection.priceCents ?? 0),
            0
          )
          const bookingStateForCoach = bookingState[coach.id]

          return (
            <article
              key={coach.id}
              className="overflow-hidden rounded-4xl border border-(--c-border) bg-white shadow-(--shadow-sm)"
            >
              <div className="flex  gap-4 p-5 flex-col sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-center gap-4 flex-1">
                  <div className="shrink-0">
                    {photo ? (
                      <PreviewImage
                        image={photo}
                        alt={coach.name}
                        previewSize="avatar"
                        previewClassName="m-0 overflow-hidden rounded-3xl bg-(--c-surface) opacity-100 shadow-none hover:opacity-100"
                        modalImageSize="lg"
                        variant="lightbox"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-(--c-surface) text-2xl font-bold text-(--c-ocean-mid)">
                        {coach.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="flex items-center gap-1.5 text-lg font-bold text-[var(--c-ocean)]">
                      <span className="truncate">{coach.name}</span>
                      {coach.verification?.status === 'verified' && (
                        <span
                          title="Coach verificado"
                          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#1d4ed8] px-2 py-0.5 text-xs font-semibold text-white"
                        >
                          ✓
                        </span>
                      )}
                    </h3>
                    <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-[var(--c-text-2)]">
                      {coach.bio || 'Este coach todavía está afinando su presentación.'}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3 flex-col sm:gap-0">
                  <button
                    type="button"
                    onClick={() => setStyleCoach(coach)}
                    aria-label={`Ver detalles de la ${CARD_PROPIERTIES_AND_STYLES_LABEL} de ${coach.name}`}
                    className="rounded-[24px] transition hover:bg-[var(--c-surface)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)]"
                  >
                    <CoachStyleMapPreview metrics={metrics} />
                  </button>
                  <div className="mt-0.5 flex items-center gap-0.5">
                    <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--c-text-2)]">
                      {CARD_PROPIERTIES_AND_STYLES_LABEL}
                    </span>
                    <IconInfo
                      type="info"
                      size={13}
                      label={`Qué es la ${CARD_PROPIERTIES_AND_STYLES_LABEL}`}
                      content={
                        <>
                          La{' '}
                          <span className="font-semibold text-[var(--c-ocean)]">
                            {CARD_PROPIERTIES_AND_STYLES_LABEL}
                          </span>{' '}
                          resume cómo entrena este coach en 8 dimensiones (técnica, paciencia,
                          planeación, relación con el agua y más). Te ayuda a comparar la
                          compatibilidad con tu forma de aprender antes de reservar, no solo el
                          precio.
                        </>
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-center justify-between gap-3 text-sm text-[var(--c-text-2)]">
                  <span>{availabilitySummary(coach)}</span>
                  <span className="font-semibold text-[var(--c-ocean)]">{priceSummary(coach)}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : coach.id)}
                  className="mt-4 inline-flex items-center justify-center rounded-full border border-[var(--c-border)] px-4 py-2 text-sm font-semibold text-[var(--c-ocean)] transition hover:border-[var(--c-aqua)]"
                >
                  {isExpanded ? 'Ver menos' : 'Ver horarios y más detalles'}
                </button>

                {isExpanded && (
                  <div className="mt-4 space-y-4 border-t border-[var(--c-border)] pt-4 text-sm text-[var(--c-text-2)]">
                    {resolveOfferings(coach).length ? (
                      <div>
                        <p className="font-semibold text-[var(--c-ocean)]">Horarios y lugares</p>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <button
                            type="button"
                            className="rounded-full border border-[var(--c-border)] px-3 py-1 font-semibold text-[var(--c-ocean)]"
                            onClick={() => setWeekStart((current) => addDays(current, -7))}
                          >
                            ←
                          </button>
                          <p className="font-semibold text-[var(--c-ocean)]">
                            Semana del{' '}
                            {weekStart.toLocaleDateString('es-MX', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </p>
                          <button
                            type="button"
                            className="rounded-full border border-[var(--c-border)] px-3 py-1 font-semibold text-[var(--c-ocean)]"
                            onClick={() => setWeekStart((current) => addDays(current, 7))}
                          >
                            →
                          </button>
                        </div>
                        {selectionGroups.length > 0 ? (
                          <div className="mt-3 flex flex-col gap-3">
                            {selectionGroups.map((group) => (
                              <div
                                key={group.key}
                                className="rounded-[24px] border border-[var(--c-border)] bg-white p-4"
                              >
                                <p className="font-semibold text-[var(--c-ocean)]">
                                  {group.mode === 'home'
                                    ? '🏠 '
                                    : group.mode === 'online'
                                      ? '💻 '
                                      : '📍 '}
                                  {group.locationName}
                                </p>
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  <span className="min-w-12 font-bold text-[var(--c-ocean)]">
                                    {group.startTime}
                                  </span>
                                  {group.selections.map((selection) => {
                                    const key = bookingSelectionKey(selection)
                                    const isActive = selectedSlotKeys.includes(key)
                                    return (
                                      <button
                                        key={key}
                                        type="button"
                                        onClick={() =>
                                          setSelectedSlots((current) => ({
                                            ...current,
                                            [coach.id]: isActive
                                              ? selectedSlotKeys.filter((item) => item !== key)
                                              : [...selectedSlotKeys, key],
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
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2">Aún no publica horarios.</p>
                        )}

                        {selectedSelections.length > 0 && (
                          <div className="mt-4 rounded-[24px] border border-[var(--c-border)] bg-white p-4">
                            <p className="text-sm font-semibold text-[var(--c-ocean)]">
                              Clases seleccionadas
                            </p>
                            <ul className="mt-2 space-y-1 text-sm text-[var(--c-text-2)]">
                              {selectedSelections.map((selection) => (
                                <li
                                  key={bookingSelectionKey(selection)}
                                  className="flex items-center justify-between gap-3"
                                >
                                  <span>
                                    {selection.mode === 'home'
                                      ? '🏠 '
                                      : selection.mode === 'online'
                                        ? '💻 '
                                        : '📍 '}
                                    {selection.locationName} · {selection.days[0]}{' '}
                                    {new Date(`${selection.date}T12:00:00`).getDate()} ·{' '}
                                    {selection.startTime}
                                  </span>
                                  <span className="text-right">
                                    <span className="font-semibold text-[var(--c-ocean)]">
                                      {selection.priceCents !== null
                                        ? formatPesos(selection.priceCents)
                                        : '—'}
                                    </span>
                                    {selection.priceCents !== null && (
                                      <span className="ml-1 text-xs text-[var(--c-text-2)]">
                                        {UNIT_LABEL[selection.unit]}
                                      </span>
                                    )}
                                  </span>
                                </li>
                              ))}
                            </ul>
                            {selectedSelections.every(
                              (selection) => selection.priceCents !== null
                            ) ? (
                              <div className="mt-3 flex items-baseline justify-end gap-3 border-t border-[var(--c-border)] pt-3">
                                <p className="text-lg font-extrabold text-[var(--c-ocean)]">
                                  Total {formatPesos(selectedTotal)}
                                </p>
                              </div>
                            ) : (
                              <p className="mt-1 text-sm font-bold text-[var(--c-ocean)]">
                                Precio por definir
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => scheduleSelection(selectedSelections)}
                              disabled={bookingStateForCoach?.status === 'loading'}
                              className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-[var(--c-aqua)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--c-aqua-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {bookingStateForCoach?.status === 'loading'
                                ? 'Agendando…'
                                : bookingStateForCoach?.status === 'success'
                                  ? 'Clase agendada'
                                  : `Agendar ${selectedSelections.length === 1 ? 'clase' : `${selectedSelections.length} clases`}`}
                            </button>
                            {bookingStateForCoach?.message && (
                              <p
                                className={`mt-2 text-sm ${
                                  bookingStateForCoach.status === 'error'
                                    ? 'text-red-600'
                                    : 'text-[var(--c-text-2)]'
                                }`}
                              >
                                {bookingStateForCoach.message}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p>Aún no publica horarios.</p>
                    )}
                  </div>
                )}
              </div>
            </article>
          )
        })}
      </div>

      {showViewMoreLink && visibleCoaches.length > renderedCoaches.length && (
        <div className="mt-8 flex justify-center">
          <Link
            href="/coaches"
            className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
            style={{ background: 'var(--c-ocean)' }}
          >
            Ver más coaches
          </Link>
        </div>
      )}

      {infiniteScroll && hasMoreCoaches && (
        <div
          ref={loadMoreRef}
          aria-hidden
          className="mt-8 h-10 rounded-full"
          style={{
            background: 'linear-gradient(90deg, transparent, var(--c-surface), transparent)',
          }}
        />
      )}

      {styleCoach && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="coach-style-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(10,37,64,0.48)] p-4"
        >
          <button
            type="button"
            aria-label="Cerrar detalles de la carta de estilo"
            className="absolute inset-0"
            onClick={() => setStyleCoach(null)}
          />
          <div className="relative max-h-[min(52rem,calc(100vh-2rem))] w-full max-w-5xl overflow-y-auto rounded-[32px] bg-[var(--c-bg)] p-5 shadow-[var(--shadow-lg)] sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--c-text-2)]">
                  {styleCoach.name}
                </p>
                <h2
                  id="coach-style-dialog-title"
                  className="mt-1 text-2xl font-extrabold text-[var(--c-ocean)] sm:text-3xl"
                >
                  {CARD_PROPIERTIES_AND_STYLES_LABEL}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setStyleCoach(null)}
                aria-label="Cerrar"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--c-border)] bg-white text-xl text-[var(--c-ocean)]"
              >
                ×
              </button>
            </div>

            <p className="mb-6 max-w-3xl text-[var(--c-text-2)]">
              Así entrena este coach en 8 dimensiones. El gráfico resume el estilo general y abajo
              puedes ver cada rasgo con sus extremos.
            </p>

            <CoachMetricsOverview metrics={normalizeCoachMetrics(styleCoach.metrics)} />
          </div>
        </div>
      )}
    </section>
  )
}
