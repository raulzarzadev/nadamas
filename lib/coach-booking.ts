import type {
  CoachAvailabilitySlot,
  CoachPublic,
  CoachTeachingLocation,
} from '@/firebase/coaches/coach.model'

export type CoachBookingSelection = {
  coachId: string
  locationId: string
  locationName: string
  days: string[]
  startTime: string
  endTime: string
}

export interface Booking extends CoachBookingSelection {
  id: string
  athleteId: string
  athleteName: string
  athletePhone?: string
  athleteEmail: string | null
  coachName: string | null
  status: string
  source: string
  createdAt: number
  updatedAt: number
}

export function formatSlotLabel(
  selection: Pick<CoachBookingSelection, 'days' | 'startTime' | 'endTime'>
) {
  const days = selection.days.join(', ')
  return `${days} · ${selection.startTime}–${selection.endTime}`
}

export function flattenCoachBookingSelections(
  coach: CoachPublic & { id: string }
): CoachBookingSelection[] {
  return (coach.teachingLocations || []).flatMap((location) =>
    location.availability.map((slot) => toBookingSelection(coach.id as string, location, slot))
  )
}

export function toBookingSelection(
  coachId: string,
  location: CoachTeachingLocation,
  slot: CoachAvailabilitySlot
): CoachBookingSelection {
  return {
    coachId,
    locationId: location.id,
    locationName: location.name || 'Lugar por definir',
    days: slot.days,
    startTime: slot.startTime,
    endTime: slot.endTime,
  }
}

export function bookingSelectionKey(selection: CoachBookingSelection) {
  return [
    selection.coachId,
    selection.locationId,
    selection.locationName,
    selection.days.join(','),
    selection.startTime,
    selection.endTime,
  ].join('::')
}

export function serializeBookingSelection(selection: CoachBookingSelection) {
  return encodeURIComponent(JSON.stringify(selection))
}

export function parseBookingSelection(raw: string | null) {
  if (!raw) return null

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<CoachBookingSelection>
    if (
      !parsed.coachId ||
      !parsed.locationId ||
      !parsed.locationName ||
      !Array.isArray(parsed.days) ||
      parsed.days.length === 0 ||
      !parsed.startTime ||
      !parsed.endTime
    ) {
      return null
    }

    return {
      coachId: parsed.coachId,
      locationId: parsed.locationId,
      locationName: parsed.locationName,
      days: parsed.days,
      startTime: parsed.startTime,
      endTime: parsed.endTime,
    } satisfies CoachBookingSelection
  } catch {
    return null
  }
}

export function buildCoachBookingTarget(selection: CoachBookingSelection) {
  return `/athlete/coach/${selection.coachId}?booking=${serializeBookingSelection(selection)}`
}
