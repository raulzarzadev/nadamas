'use client'

import type { SchoolEvent } from '@/lib/school-events'
import SchoolEventsList from './SchoolEventsList'
import { SchoolGateMessage } from './SchoolPrivateGate'
import { useSchoolMemberData } from './use-school-member-data'

const DEFAULT_TIMEZONE = 'America/Mexico_City'

function isEventsPayload(payload: unknown): payload is { events: SchoolEvent[] } {
  return Array.isArray((payload as { events?: unknown } | null)?.events)
}

/**
 * Past events. Public schools render the server's public events immediately and upgrade to
 * public+private for members; non-public schools show only the member gate until allowed.
 */
export default function SchoolPastEvents({
  schoolId,
  slug,
  isPublic,
  timezone = DEFAULT_TIMEZONE,
  initialEvents = [],
}: {
  schoolId: string
  slug: string
  isPublic: boolean
  timezone?: string
  initialEvents?: SchoolEvent[]
}) {
  const state = useSchoolMemberData(
    `/api/schools/${encodeURIComponent(schoolId)}/events?scope=past`,
    isEventsPayload
  )
  if (state.status !== 'ready' && !isPublic)
    return <SchoolGateMessage status={state.status} redirectTo={`/school/${slug}/events`} />
  return (
    <SchoolEventsList
      variant="past"
      events={state.status === 'ready' ? state.data.events : initialEvents}
      slug={slug}
      timezone={timezone}
      showPrivateTag={state.status === 'ready'}
    />
  )
}
