'use client'

import Link from 'next/link'
import { FiChevronRight, FiInbox } from 'react-icons/fi'
import {
  type PendingSchoolRequest,
  pendingRequestHref,
  pendingRequestLabel,
  selectRequestSchool,
} from './usePendingSchoolRequests'

/** "Solicitudes pendientes" block for the bell panel and /notifications. */
export default function PendingSchoolRequests({
  items,
  onNavigate,
  showSchool,
}: {
  items: PendingSchoolRequest[]
  onNavigate?: () => void
  showSchool: boolean
}) {
  if (!items.length) return null
  return (
    <section aria-label="Solicitudes pendientes" className="border-b border-(--c-border)">
      <p className="px-3 pt-3 pb-1 text-xs font-bold tracking-wide text-(--c-text-2) uppercase">
        Solicitudes pendientes
      </p>
      {items.map((item) => (
        <Link
          key={item.key}
          href={pendingRequestHref(item)}
          onClick={() => {
            selectRequestSchool(item)
            onNavigate?.()
          }}
          className="flex items-center gap-3 px-3 py-3 hover:bg-(--c-surface)"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-800">
            <FiInbox aria-hidden="true" />
          </span>
          <span className="grid min-w-0 flex-1">
            <span className="truncate text-sm font-bold text-(--c-ocean)">
              {pendingRequestLabel(item)}
            </span>
            {showSchool && (
              <span className="truncate text-xs text-(--c-text-2)">{item.schoolName}</span>
            )}
          </span>
          <FiChevronRight aria-hidden="true" className="shrink-0 text-(--c-text-2)" />
        </Link>
      ))}
    </section>
  )
}
