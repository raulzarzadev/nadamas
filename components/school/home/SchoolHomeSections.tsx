import SchoolPublicContacts from '@/components/school/SchoolPublicContacts'
import type { SchoolContact } from '@/lib/school-contact'
import type { SchoolEvent } from '@/lib/school-events'
import type { SchoolGalleryPhoto, SchoolHomeSection } from '@/lib/school-home'
import SchoolEventsList from './SchoolEventsList'
import SchoolGallery from './SchoolGallery'

/** Coordinator-ordered home sections, shared by the visitor view and the member dashboard. */
export default function SchoolHomeSections({
  sections,
  schoolId,
  slug,
  timezone,
  events,
  gallery,
  contacts,
  showPrivateTag,
}: {
  sections: SchoolHomeSection[]
  schoolId: string
  slug: string
  timezone: string
  events: SchoolEvent[]
  gallery: SchoolGalleryPhoto[]
  contacts: SchoolContact[]
  showPrivateTag: boolean
}) {
  return sections.map((section) => {
    if (section === 'events')
      return (
        <SchoolEventsList
          key={section}
          events={events}
          slug={slug}
          timezone={timezone}
          showPrivateTag={showPrivateTag}
        />
      )
    if (section === 'gallery') return <SchoolGallery key={section} photos={gallery} />
    return <SchoolPublicContacts key={section} schoolId={schoolId} initialContacts={contacts} />
  })
}
