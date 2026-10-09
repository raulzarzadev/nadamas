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
  const buttonClass =
    'relative inline-flex h-8 min-h-8 min-w-8 justify-center shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-2 text-[11px] font-medium text-(--c-ocean) hover:bg-white/70 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 before:absolute before:-inset-y-1.5'
  return (
    <ClassCard
      time={time}
      date={date}
      coachName={coachName}
      showCoachName
      unassigned={unassigned}
      groupType={groupType}
      status={groupType === 'grupal' ? 'group' : 'booked'}
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
      <div className="@container/request-actions flex items-center gap-2 [&>div:first-child]:min-w-0 [&>div:first-child]:flex-1 [&>div>div:first-child]:min-w-0">
        <ClassStudentRow name={studentName} disabled={busy} onEdit={onEdit} />
        {(status === 'pending' ? onAccept || onReject : onChange || onArchive) && (
          <div className="flex shrink-0 items-center justify-end gap-1">
            {status === 'pending' && onAccept && (
              <button
                type="button"
                disabled={busy}
                className={buttonClass}
                onClick={onAccept}
                aria-label={`Aceptar solicitud de ${studentName}`}
                title="Aceptar"
              >
                <FiCheck aria-hidden="true" />
                <span className="hidden @min-[400px]/request-actions:inline">Aceptar</span>
              </button>
            )}
            {status === 'pending' && onReject && (
              <button
                type="button"
                disabled={busy}
                className={buttonClass}
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
                className={buttonClass}
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
                className={buttonClass}
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
