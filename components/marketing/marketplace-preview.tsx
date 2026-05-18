'use client'

import { CoachStyleMapPreview } from '@comps/coach/CoachRadarChart'
import { onAuthStateChanged } from 'firebase/auth'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { FiInfo } from 'react-icons/fi'
import { CARD_PROPIERTIES_AND_STYLES_LABEL } from '@/CONSTANTS/LABELS'
import type { CoachPublic } from '@/firebase/coaches/coach.model'
import { auth } from '@/firebase/index'
import {
  bookingSelectionKey,
  buildCoachBookingTarget,
  type CoachBookingSelection,
  flattenCoachBookingSelections,
  formatSlotLabel,
} from '@/lib/coach-booking'
import { normalizeCoachMetrics } from '@/lib/coach-metrics'

interface PublicCoachDirectoryItem extends CoachPublic {
  id: string
  name: string
  avatarUrl?: string
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
  const locations = coach.teachingLocations || []
  const slotCount = locations.reduce((total, location) => total + location.availability.length, 0)
  if (!locations.length) return 'Horarios por publicar'
  if (!slotCount) return `${locations.length} ${locations.length === 1 ? 'lugar' : 'lugares'}`
  return `${locations.length} ${locations.length === 1 ? 'lugar' : 'lugares'} · ${slotCount} ${slotCount === 1 ? 'horario' : 'horarios'}`
}

function priceSummary(coach: PublicCoachDirectoryItem) {
  const firstPrice = coach.priceOptions?.find((option) => option.amount !== null)
  if (!firstPrice) return 'Precio por definir'
  return `$${firstPrice.amount} / ${firstPrice.unit}`
}

export default function MarketplacePreview() {
  const router = useRouter()
  const [coaches, setCoaches] = useState<PublicCoachDirectoryItem[]>([])
  const [query, setQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [selectedSlots, setSelectedSlots] = useState<Record<string, string>>({})
  const [styleInfoId, setStyleInfoId] = useState<string | null>(null)
  const [bookingState] = useState<
    Record<
      string,
      {
        status: 'idle' | 'loading' | 'success' | 'error'
        message?: string
      }
    >
  >({})

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

  const visibleCoaches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return coaches
    return coaches.filter((coach) => coach.name.toLowerCase().includes(normalizedQuery))
  }, [coaches, query])

  const scheduleSelection = (selection: CoachBookingSelection) => {
    const sessionUserId = currentUserId || auth.currentUser?.uid || null
    const target = buildCoachBookingTarget(selection)

    if (!sessionUserId) {
      router.push(`/login?redirectTo=${encodeURIComponent(target)}`)
      return
    }

    router.push(target)
  }

  return (
    <section id="coaches" className="mx-auto max-w-[1180px] px-5 py-20 sm:px-8 lg:py-28">
      <div className="reveal grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
        <div className="max-w-[34ch]">
          <h2 className="text-[2.1rem] font-extrabold sm:text-[2.9rem]">
            Encuentra un coach compatible contigo
          </h2>
          <p className="mt-4 text-lg leading-relaxed" style={{ color: 'var(--c-text-2)' }}>
            La {CARD_PROPIERTIES_AND_STYLES_LABEL} resume cómo entrena cada profe: qué tan técnico,
            paciente, planeado o conectado con el agua es. Así comparas estilos antes de reservar,
            no solo precios.
          </p>
        </div>

        <label className="block">
          <span className="sr-only">Buscar coach por nombre</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre"
            className="h-14 w-full rounded-full border border-[var(--c-border)] bg-white px-6 text-base shadow-[var(--shadow-sm)] outline-none transition focus:border-[var(--c-aqua)]"
          />
        </label>
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

        {visibleCoaches.map((coach) => {
          const photo = coachPhoto(coach)
          const isExpanded = expandedId === coach.id
          const metrics = normalizeCoachMetrics(coach.metrics)
          const selections = flattenCoachBookingSelections(coach)
          const fallbackSelection = selections[0]
          const selectedSlotKey =
            selectedSlots[coach.id] || (fallbackSelection && bookingSelectionKey(fallbackSelection))
          const selectedSelection = selections.find(
            (selection) => bookingSelectionKey(selection) === selectedSlotKey
          )
          const bookingStateForCoach = bookingState[coach.id]

          return (
            <article
              key={coach.id}
              className="overflow-hidden rounded-[32px] border border-[var(--c-border)] bg-white shadow-[var(--shadow-sm)]"
            >
              <div className="flex items-center gap-4 p-5">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-3xl bg-[var(--c-surface)]">
                  {photo ? (
                    <Image
                      src={photo}
                      alt={coach.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-[var(--c-ocean-mid)]">
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

                <div className="flex shrink-0 flex-col items-center">
                  <CoachStyleMapPreview metrics={metrics} />
                  <div className="mt-0.5 flex items-center gap-1">
                    <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--c-text-2)]">
                      {CARD_PROPIERTIES_AND_STYLES_LABEL}
                    </span>
                    <button
                      type="button"
                      aria-label={`Qué es la ${CARD_PROPIERTIES_AND_STYLES_LABEL}`}
                      aria-expanded={styleInfoId === coach.id}
                      onClick={() =>
                        setStyleInfoId((current) => (current === coach.id ? null : coach.id))
                      }
                      className="grid h-4 w-4 place-items-center rounded-full text-[#1d4ed8] transition hover:bg-[#1d4ed8]/10"
                    >
                      <FiInfo aria-hidden="true" className="text-xs" />
                    </button>
                  </div>
                </div>
              </div>

              {styleInfoId === coach.id && (
                <div className="mx-5 mb-1 rounded-2xl bg-[var(--c-surface)] p-4 text-sm leading-6 text-[var(--c-text-2)]">
                  La{' '}
                  <span className="font-semibold text-[var(--c-ocean)]">
                    {CARD_PROPIERTIES_AND_STYLES_LABEL}
                  </span>{' '}
                  resume cómo entrena este coach en 8 dimensiones (técnica, paciencia, planeación,
                  relación con el agua y más). Te ayuda a comparar la compatibilidad con tu forma de
                  aprender antes de reservar, no solo el precio.
                </div>
              )}

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
                    {coach.teachingLocations?.length ? (
                      <div>
                        <p className="font-semibold text-[var(--c-ocean)]">Horarios y lugares</p>
                        {selections.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {selections.map((selection) => {
                              const key = bookingSelectionKey(selection)
                              const isActive = key === selectedSlotKey
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() =>
                                    setSelectedSlots((current) => ({
                                      ...current,
                                      [coach.id]: key,
                                    }))
                                  }
                                  className={`rounded-full border px-3 py-2 text-left text-sm font-semibold transition ${
                                    isActive
                                      ? 'border-[var(--c-aqua)] bg-[var(--c-aqua-light)] text-[var(--c-ocean)]'
                                      : 'border-[var(--c-border)] bg-white text-[var(--c-ocean)] hover:border-[var(--c-aqua)]'
                                  }`}
                                >
                                  {formatSlotLabel(selection)}
                                </button>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="mt-2">Aún no publica horarios.</p>
                        )}

                        {!!selectedSelection && (
                          <div className="mt-4 rounded-[24px] border border-[var(--c-border)] bg-white p-4">
                            <p className="text-sm font-semibold text-[var(--c-ocean)]">
                              {selectedSelection.locationName}
                            </p>
                            <p className="mt-1 text-sm text-[var(--c-text-2)]">
                              {formatSlotLabel(selectedSelection)}
                            </p>
                            <button
                              type="button"
                              onClick={() => scheduleSelection(selectedSelection)}
                              disabled={bookingStateForCoach?.status === 'loading'}
                              className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-[var(--c-aqua)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--c-aqua-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {bookingStateForCoach?.status === 'loading'
                                ? 'Agendando…'
                                : bookingStateForCoach?.status === 'success'
                                  ? 'Clase agendada'
                                  : 'Agendar'}
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

                    {!!coach.priceOptions?.length && (
                      <div>
                        <p className="font-semibold text-[var(--c-ocean)]">Precios</p>
                        <ul className="mt-2 space-y-1">
                          {coach.priceOptions.map((option) => (
                            <li key={option.id}>
                              {option.title || 'Clase'} ·{' '}
                              {option.amount !== null ? `$${option.amount}` : '—'} / {option.unit}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
