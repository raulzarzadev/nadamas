'use client'

import { FiArchive, FiCheck, FiRefreshCw, FiX } from 'react-icons/fi'
import { notificationTimeAgo } from '@/lib/notification'
import ClassCard from './class-card'
import ClassStudentRow from './class-student-row'
import StatusBadge from './status-badge'

export default function ClassRequestCard({
  time,
  date,
  coachName,
  unassigned,
  groupType,
  studentName,
  status = 'pending',
  busy = false,
  onAccept,
  onReject,
  onArchive,
  onEdit,
  onChange,
  statusLabel,
  archived = false,
  archivedAt,
}: {
  archived?: boolean
  archivedAt?: number
  statusLabel?: string
  time: string
  date: string
  coachName: string
  unassigned?: boolean
  groupType: 'particular' | 'grupal'
  studentName: string
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled'
  busy?: boolean
  onAccept?: () => void
  onReject?: () => void
  onArchive?: () => void
  onEdit?: () => void
  onChange?: () => void
}) {
  // Same action language as the expanded request in CoachAgenda:
  // solid green approve, rose outline reject, quiet text for secondary actions.
  const buttonBase =
    'relative inline-flex h-8 min-h-8 min-w-8 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full px-2 text-[11px] font-bold before:absolute before:-inset-y-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong) disabled:opacity-50 @min-[400px]/request-actions:px-3'
  const approveClass = `${buttonBase} bg-emerald-700 text-white hover:bg-emerald-800`
  const rejectClass = `${buttonBase} border border-(--rose-bd) bg-white text-(--rose-tx) hover:bg-(--rose-bg)`
  const secondaryClass = `${buttonBase} font-semibold text-(--c-text-2) hover:bg-(--c-surface) hover:text-(--c-ocean)`
  // Only approved requests occupy the hour; the rest render hollow.
  const cardStatus =
    status === 'approved'
      ? groupType === 'grupal'
        ? 'group'
        : 'booked'
      : groupType === 'grupal'
        ? 'groupAvailable'
        : 'available'
  return (
    <ClassCard
      time={time}
      // Date joins the time row ("jue 29 de oct · 05:00") so the card header
      // fits coach · tipo · estado on one line, even on mobile.
      timeLabel={
        <>
          <span className="inline-block font-semibold text-(--c-text-2) first-letter:uppercase">
            {date}
          </span>
          <span aria-hidden="true" className="px-1.5 font-semibold text-(--c-text-2)">
            ·
          </span>
          {time}
        </>
      }
      coachName={coachName}
      showCoachName
      unassigned={unassigned}
      groupType={groupType}
      status={cardStatus}
      pending={status === 'pending'}
      showSeparator={false}
      compact
      statusBadge={
        status !== 'pending' ? (
          <StatusBadge
            status={status === 'approved' ? 'confirmed' : 'cancelled'}
            label={
              statusLabel ||
              (status === 'approved'
                ? 'Aprobada'
                : status === 'rejected'
                  ? 'Rechazada'
                  : 'Cancelada')
            }
          />
        ) : undefined
      }
    >
      {/* One white row per student, actions inline on the right: keeps each
          request ~one avatar tall when 5+ are stacked. */}
      <div className="@container/request-actions flex items-center gap-2 rounded-xl border border-(--c-border) bg-white pr-2 [&>div:first-child]:min-w-0 [&>div:first-child]:flex-1 [&>div:first-child]:bg-transparent [&>div:first-child]:py-1.5 [&>div:first-child]:pl-2 [&>div:first-child]:pr-0 [&>div>div:first-child]:min-w-0">
        <ClassStudentRow name={studentName} disabled={busy} onEdit={onEdit} />
        {(status === 'pending' ? onAccept || onReject : onChange || onArchive) && (
          <div className="flex shrink-0 items-center justify-end gap-1.5">
            {status === 'pending' && onAccept && (
              <button
                type="button"
                disabled={busy}
                className={approveClass}
                onClick={onAccept}
                aria-label={`Aprobar solicitud de ${studentName}`}
                title="Aprobar"
              >
                <FiCheck aria-hidden="true" />
                <span className="hidden @min-[400px]/request-actions:inline">Aprobar</span>
              </button>
            )}
            {status === 'pending' && onReject && (
              <button
                type="button"
                disabled={busy}
                className={rejectClass}
                onClick={onReject}
                aria-label={`Rechazar solicitud de ${studentName}`}
                title="Rechazar"
              >
                <FiX aria-hidden="true" />
                <span className="hidden @min-[400px]/request-actions:inline">Rechazar</span>
              </button>
            )}
            {status !== 'pending' && onChange && (
              <button
                type="button"
                disabled={busy}
                className={secondaryClass}
                onClick={onChange}
                aria-label={`Cambiar estado de la solicitud de ${studentName}`}
                title="Cambiar estado"
              >
                <FiRefreshCw aria-hidden="true" />
                <span className="hidden @min-[400px]/request-actions:inline">Cambiar</span>
              </button>
            )}
            {status !== 'pending' && onArchive && (
              <button
                type="button"
                disabled={busy}
                className={secondaryClass}
                onClick={onArchive}
                aria-label={`Archivar solicitud de ${studentName}`}
                title="Archivar"
              >
                <FiArchive aria-hidden="true" />
                <span className="hidden @min-[400px]/request-actions:inline">Archivar</span>
              </button>
            )}
          </div>
        )}
      </div>
      {archived && (
        <p className="text-[10px] text-(--c-text-2)">
          {archivedAt
            ? `Archivada ${notificationTimeAgo(archivedAt)}`
            : 'Archivada · fecha no disponible'}
        </p>
      )}
    </ClassCard>
  )
}
