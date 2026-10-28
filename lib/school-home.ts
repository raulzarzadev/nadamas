import { formatInTimeZone } from 'date-fns-tz'
import type { School } from '@/lib/school'

export type SchoolHomeSection = 'events' | 'gallery' | 'contacts'

export const DEFAULT_HOME_SECTIONS: SchoolHomeSection[] = ['events', 'gallery', 'contacts']

export const MAX_GALLERY_PHOTOS = 24

export interface SchoolGalleryPhoto {
  id: string
  url: string
  createdAt: number
}

export function normalizeHomeSections(value: unknown): SchoolHomeSection[] | null {
  if (!Array.isArray(value)) return null
  const sections: SchoolHomeSection[] = []
  for (const item of value) {
    if (!DEFAULT_HOME_SECTIONS.includes(item as SchoolHomeSection)) return null
    if (sections.includes(item as SchoolHomeSection)) return null
    sections.push(item as SchoolHomeSection)
  }
  return sections
}

export function homeSectionsOf(school: Pick<School, 'homeSections'>): SchoolHomeSection[] {
  return school.homeSections ?? DEFAULT_HOME_SECTIONS
}

const SPANISH_WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const SPANISH_MONTHS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
]

function shiftDateKey(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** `hoy 17:00`, `mañana 16:00`, else `sáb 9 nov` (+ time), relative to today in `timezone`. */
export function formatSchoolDay(
  date: string,
  time: string | null,
  timezone: string,
  now: number = Date.now()
): string {
  const today = formatInTimeZone(now, timezone, 'yyyy-MM-dd')
  let day: string
  if (date === today) day = 'hoy'
  else if (date === shiftDateKey(today, 1)) day = 'mañana'
  else {
    const parsed = new Date(`${date}T12:00:00Z`)
    day = `${SPANISH_WEEKDAYS[parsed.getUTCDay()]} ${parsed.getUTCDate()} ${SPANISH_MONTHS[parsed.getUTCMonth()]}`
  }
  return time ? `${day} ${time}` : day
}

/** Metadata for non-public schools: nothing identifying, never indexed. */
export const PRIVATE_SCHOOL_METADATA = {
  title: 'Escuela',
  robots: { index: false, follow: false },
}
