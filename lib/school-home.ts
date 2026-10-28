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
