'use client'

import type { ReactNode, Ref } from 'react'
import { FiLock, FiPlus, FiUnlock, FiUser, FiUsers } from 'react-icons/fi'
import CoachBadge from '@/components/ui/coach-badge'
import StatusBadge from '@/components/ui/status-badge'
import { HOUR_STATUS_STYLE, type HourStatus } from '@/lib/coach-agenda-status'

/** Shared class presentation. Callers provide students and role-specific actions. */
export default function ClassCard({
  time,
  date,
  showTime = true,
  hideTimeColumn = false,
  showSeparator = true,
  status,
  coachName,
  showCoachName = false,
  unassigned = false,
  groupType = 'particular',
  statusLabel,
  agendaLabel,
  pending = false,
  addStudent,
  actions,
  ref,
  focused = false,
  children,
}: {
  time: string
  date?: string
  showTime?: boolean
  hideTimeColumn?: boolean
  showSeparator?: boolean
  status?: HourStatus
  coachName?: string
  showCoachName?: boolean
  unassigned?: boolean
  groupType?: 'particular' | 'grupal'
  statusLabel?: string
  agendaLabel?: string
  pending?: boolean
  addStudent?: {
    label: string
    ariaLabel: string
    title?: string
    disabled: boolean
    onClick?: () => void
  }
  actions?: ReactNode
  ref?: Ref<HTMLDivElement>
  focused?: boolean
  children?: ReactNode
}) {
  const cardStyle = status ? HOUR_STATUS_STYLE[status] : null
  const isBlockedCard = status === 'blocked'
  const isAvailableCard = status === 'available' || status === 'groupAvailable'
  return (
    <div
      className={`flex flex-col gap-1 px-3 py-2 @min-[640px]:flex-row @min-[640px]:items-center @min-[640px]:gap-3 sm:px-5 sm:py-1.5 ${
        showSeparator ? 'sm:border-b sm:border-[var(--c-border)]' : ''
      }`}
    >
      {!hideTimeColumn && (
        <span className="w-fit text-sm font-extrabold text-[var(--c-ocean)] @min-[640px]:w-12 @min-[640px]:shrink-0 @min-[640px]:text-sm @min-[640px]:font-semibold @min-[640px]:text-[var(--c-text-2)]">
          {showTime ? time : <span className="sr-only">{time}</span>}
        </span>
      )}
      <div className="flex min-w-0 w-full @min-[640px]:w-auto @min-[640px]:flex-1">
        {status && cardStyle ? (
          <div
            ref={ref}
            tabIndex={focused ? -1 : undefined}
            className={`flex min-w-0 flex-1 scroll-mt-32 flex-col gap-2 rounded-[var(--r-md)] border px-2.5 py-1 sm:px-3 ${cardStyle.border} ${cardStyle.bg} ${focused ? 'outline outline-2 outline-offset-2 outline-[var(--c-aqua-strong)]' : ''}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                {date && <span className="text-xs text-(--c-text-2)">{date}</span>}
                {showCoachName && coachName && (
                  <CoachBadge name={coachName} unassigned={unassigned} />
                )}
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--c-text-2)]">
                  {statusLabel && (
                    <span className="inline-flex items-center gap-1">
                      {isBlockedCard ? (
                        <FiLock aria-hidden="true" className="h-3.5 w-3.5" />
                      ) : isAvailableCard ? (
                        <FiUnlock aria-hidden="true" className="h-3.5 w-3.5" />
                      ) : null}
                      {statusLabel}
                    </span>
                  )}
                  {statusLabel && <span aria-hidden="true">·</span>}
                  <span className="inline-flex items-center gap-1">
                    {groupType === 'grupal' ? (
                      <FiUsers aria-hidden="true" className="h-3.5 w-3.5" />
                    ) : (
                      <FiUser aria-hidden="true" className="h-3.5 w-3.5" />
                    )}
                    {groupType === 'grupal' ? 'Grupal' : 'Particular'}
                  </span>
                </span>
                {pending && <StatusBadge status="pending" />}
                {agendaLabel && (
                  <span className="w-fit rounded-full border border-[var(--c-border)] bg-white/80 px-2.5 py-1 text-xs font-bold text-[var(--c-ocean)]">
                    {agendaLabel}
                  </span>
                )}
              </div>
              {(actions || addStudent) && (
                <div className="ml-auto flex shrink-0 items-center justify-end gap-1.5">
                  {addStudent && (
                    <button
                      type="button"
                      onClick={addStudent.onClick}
                      disabled={addStudent.disabled}
                      aria-label={addStudent.ariaLabel}
                      title={addStudent.title}
                      className={`relative inline-flex h-7 min-h-7 items-center justify-center gap-1 rounded-full px-2 text-[10px] before:absolute before:-inset-y-2 before:inset-x-0 font-bold sm:flex-none ${isBlockedCard ? 'cursor-not-allowed bg-slate-200 text-slate-500 opacity-70' : 'bg-[var(--c-aqua)] text-white transition-colors hover:bg-[var(--c-aqua-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)] disabled:cursor-not-allowed disabled:opacity-50'}`}
                    >
                      <FiPlus aria-hidden="true" /> {addStudent.label}
                    </button>
                  )}
                  {actions && (
                    <div className="[&_button]:relative [&_button]:size-8! [&_button]:min-h-8! [&_button]:p-0! [&_button]:border-0! [&_button]:bg-transparent! [&_button]:before:absolute [&_button]:before:-inset-1.5 [&_svg]:size-3.5">
                      {actions}
                    </div>
                  )}
                </div>
              )}
            </div>
            {children}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
