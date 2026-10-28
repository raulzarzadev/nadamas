import { formatInTimeZone } from 'date-fns-tz'
import { isSafeSchoolUrl } from '@/lib/school'

export interface SchoolEventLink {
  label: string
  url: string
}

export interface SchoolEvent {
  id: string
  schoolId: string
  date: string
  time: string | null
  title: string
  description: string
  photoUrl: string | null
  links: SchoolEventLink[]
  visibility: 'public' | 'private'
  createdBy: string
  createdAt: number
  updatedAt: number
}

export type SchoolEventInput = Omit<
  SchoolEvent,
  'id' | 'schoolId' | 'createdBy' | 'createdAt' | 'updatedAt'
>

export type SchoolEventInputError =
  | 'date'
  | 'time'
  | 'title'
  | 'description'
  | 'photo'
  | 'links'
  | 'visibility'

export const SCHOOL_EVENT_ERRORS: Record<SchoolEventInputError, string> = {
  date: 'Elige una fecha válida.',
  time: 'La hora no es válida.',
  title: 'Escribe un título (2 a 120 caracteres).',
  description: 'La descripción es demasiado larga.',
  photo: 'La foto no es válida.',
  links: 'Revisa los enlaces (máximo 5).',
  visibility: 'Elige si el evento es público o privado.',
}

const MAX_LINKS = 5

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export function normalizeSchoolEventInput(
  body: unknown,
  isAllowedImage: (url: string) => boolean
): { ok: true; value: SchoolEventInput } | { ok: false; reason: SchoolEventInputError } {
  const input = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const date = typeof input.date === 'string' ? input.date.trim() : ''
  if (!isValidDate(date)) return { ok: false, reason: 'date' }

  let time: string | null = null
  if (input.time !== undefined && input.time !== null && input.time !== '') {
    if (typeof input.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time))
      return { ok: false, reason: 'time' }
    time = input.time
  }

  const title = typeof input.title === 'string' ? input.title.trim() : ''
  if (title.length < 2 || title.length > 120) return { ok: false, reason: 'title' }

  const description = typeof input.description === 'string' ? input.description.trim() : ''
  if (input.description !== undefined && typeof input.description !== 'string')
    return { ok: false, reason: 'description' }
  if (description.length > 2000) return { ok: false, reason: 'description' }

  let photoUrl: string | null = null
  if (input.photoUrl !== undefined && input.photoUrl !== null && input.photoUrl !== '') {
    if (typeof input.photoUrl !== 'string' || !isAllowedImage(input.photoUrl))
      return { ok: false, reason: 'photo' }
    photoUrl = input.photoUrl
  }

  const rawLinks = input.links === undefined || input.links === null ? [] : input.links
  if (!Array.isArray(rawLinks) || rawLinks.length > MAX_LINKS) return { ok: false, reason: 'links' }
  const links: SchoolEventLink[] = []
  for (const raw of rawLinks) {
    const item = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
    const label = typeof item.label === 'string' ? item.label.trim() : ''
    const url = typeof item.url === 'string' ? item.url.trim() : ''
    if (label.length < 1 || label.length > 60 || !url || url.length > 500 || !isSafeSchoolUrl(url))
      return { ok: false, reason: 'links' }
    links.push({ label, url })
  }

  if (input.visibility !== 'public' && input.visibility !== 'private')
    return { ok: false, reason: 'visibility' }

  return {
    ok: true,
    value: { date, time, title, description, photoUrl, links, visibility: input.visibility },
  }
}

export function splitSchoolEvents(
  events: SchoolEvent[],
  timezone: string,
  now: number = Date.now()
): { upcoming: SchoolEvent[]; past: SchoolEvent[] } {
  const today = formatInTimeZone(now, timezone, 'yyyy-MM-dd')
  const key = (event: SchoolEvent) => `${event.date} ${event.time ?? '00:00'}`
  const upcoming = events.filter((event) => event.date >= today)
  const past = events.filter((event) => event.date < today)
  upcoming.sort((a, b) => key(a).localeCompare(key(b)))
  past.sort((a, b) => key(b).localeCompare(key(a)))
  return { upcoming, past }
}
