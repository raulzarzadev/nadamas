'use client'

import { useEffect, useState } from 'react'
import { getAuthed } from '@/lib/client/authed-api'
import type { School, SchoolClassRequest, SchoolMembership } from '@/lib/school'
import { schoolMembershipHasRole } from '@/lib/school'

export type PendingSchoolRequest = {
  key: string
  schoolId: string
  schoolName: string
  kind: 'classes' | 'access' | 'payments' | 'coachPayments'
  count: number
}

const pendingOrders = (data: { orders?: Array<{ status: string }> }) =>
  (data.orders || []).filter((order) => order.status === 'pending').length

/**
 * Pending items to review — schedule requests, access requests and payments to approve
 * (school as director, personal classes as coach) — shown in the bell and on /notifications.
 */
export default function usePendingSchoolRequests(uid: string | undefined) {
  const [pending, setPending] = useState<PendingSchoolRequest[]>([])
  useEffect(() => {
    if (!uid) {
      setPending([])
      return
    }
    let active = true
    const load = async () => {
      const response = await getAuthed('/api/schools')
      const payload = (await response.json()) as {
        schools?: Array<{ school: School; membership: SchoolMembership }>
      }
      const schools = (payload.schools || []).filter(
        ({ membership }) =>
          membership.status === 'active' && schoolMembershipHasRole(membership, 'director')
      )
      const rows = await Promise.all(
        schools
          .flatMap<Promise<PendingSchoolRequest | null>>(({ school }) => [
            getAuthed(`/api/schools/${encodeURIComponent(school.id)}/class-requests`)
              .then((res) => res.json() as Promise<{ requests?: SchoolClassRequest[] }>)
              .then((data) => ({
                key: `${school.id}:classes`,
                schoolId: school.id,
                schoolName: school.name,
                kind: 'classes' as const,
                count: (data.requests || []).filter(
                  (request) => request.status === 'pending' && !request.archivedBy?.includes(uid)
                ).length,
              }))
              .catch(() => null),
            getAuthed(`/api/schools/${encodeURIComponent(school.id)}/access-requests?review=true`)
              .then((res) => res.json() as Promise<{ requests?: unknown[] }>)
              .then((data) => ({
                key: `${school.id}:access`,
                schoolId: school.id,
                schoolName: school.name,
                kind: 'access' as const,
                count: (data.requests || []).length,
              }))
              .catch(() => null),
            getAuthed(`/api/payments?schoolId=${encodeURIComponent(school.id)}`)
              .then((res) => res.json() as Promise<{ orders?: Array<{ status: string }> }>)
              .then((data) => ({
                key: `${school.id}:payments`,
                schoolId: school.id,
                schoolName: school.name,
                kind: 'payments' as const,
                count: pendingOrders(data),
              }))
              .catch(() => null),
          ])
          .concat(
            // Personal classes: the coach approves their own payments (404s for non-coaches).
            getAuthed(`/api/payments?coachId=${encodeURIComponent(uid)}`)
              .then((res) =>
                res.ok
                  ? (res.json() as Promise<{
                      manager?: boolean
                      orders?: Array<{ status: string }>
                    }>)
                  : null
              )
              .then((data) =>
                data?.manager
                  ? {
                      key: 'personal:payments',
                      schoolId: '',
                      schoolName: 'Mis clases particulares',
                      kind: 'coachPayments' as const,
                      count: pendingOrders(data),
                    }
                  : null
              )
              .catch(() => null)
          )
      )
      if (active)
        setPending(rows.filter((row): row is PendingSchoolRequest => Boolean(row && row.count > 0)))
    }
    load().catch(() => {
      if (active) setPending([])
    })
    return () => {
      active = false
    }
  }, [uid])
  return pending
}

/** Where a pending request opens its review sheet. */
export function pendingRequestHref(item: PendingSchoolRequest) {
  if (item.kind === 'classes') return '/school/classes?requests=1'
  if (item.kind === 'access') return '/school/students?access=1'
  // ?tab=orders opens "Cobros", where payments are confirmed.
  return item.kind === 'payments' ? '/school/payments?tab=orders' : '/coach/payments?tab=orders'
}

export function pendingRequestLabel(item: PendingSchoolRequest) {
  const plural = item.count !== 1
  if (item.kind === 'classes')
    return `${item.count} ${plural ? 'solicitudes de horario' : 'solicitud de horario'}`
  if (item.kind === 'access')
    return `${item.count} ${plural ? 'solicitudes de acceso' : 'solicitud de acceso'}`
  return `${item.count} ${plural ? 'pagos por aprobar' : 'pago por aprobar'}`
}

// The review pages read the coordinator's selected school; point it at the request's school.
export function selectRequestSchool(item: PendingSchoolRequest) {
  if (!item.schoolId) return
  try {
    window.localStorage.setItem('nadamas.schoolId', item.schoolId)
  } catch {}
}
