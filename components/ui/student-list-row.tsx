import type { ReactNode } from 'react'
import { FaFemale, FaMale, FaUser } from 'react-icons/fa'
import { FiMail } from 'react-icons/fi'
import LabelChip from '@/components/ui/label-chip'

export default function StudentListRow({
  student,
  action,
  labels,
}: {
  student: {
    name: string
    gender?: string
    birthDate?: string
    additionalProfileId?: string
    email?: string | null
  }
  labels?: ReactNode
  action: ReactNode
}) {
  const GenderIcon =
    student.gender === 'varonil' ? FaMale : student.gender === 'femenil' ? FaFemale : FaUser
  const genderLabel =
    student.gender === 'varonil'
      ? 'Hombre'
      : student.gender === 'femenil'
        ? 'Mujer'
        : 'Sin especificar'
  const today = new Date()
  const birth = student.birthDate ? new Date(`${student.birthDate}T12:00:00`) : null
  let age: number | null = null
  if (birth && !Number.isNaN(birth.getTime()) && birth <= today) {
    age = today.getFullYear() - birth.getFullYear()
    if (
      today.getMonth() < birth.getMonth() ||
      (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
    )
      age -= 1
  }
  return (
    <article className="@container flex items-center gap-2 border-b border-(--c-border) px-3 py-2 last:border-b-0 hover:bg-(--c-surface)">
      <span
        role="img"
        aria-label={genderLabel}
        title={genderLabel}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-(--c-surface) text-(--c-ocean-mid)"
      >
        <GenderIcon aria-hidden="true" className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1 @min-[30rem]:grid @min-[30rem]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @min-[30rem]:items-center @min-[30rem]:gap-2">
        <div className="min-w-0">
          {(labels || student.additionalProfileId) && (
            <div className="mb-0.5 flex min-w-0 flex-wrap items-center gap-1 [&>div]:justify-start">
              {student.additionalProfileId && (
                <LabelChip
                  label={{ id: 'system-additional', name: 'Adicional', color: 'system-gray' }}
                  size="tiny"
                />
              )}
              {labels}
            </div>
          )}
          <div className="flex min-w-0 items-baseline gap-2">
            <h2 className="truncate text-sm leading-tight font-bold text-(--c-ocean)">
              {student.name}
            </h2>
            {age !== null && (
              <span className="shrink-0 text-xs leading-tight text-(--c-text-2)">
                {age} {age === 1 ? 'año' : 'años'}
              </span>
            )}
          </div>
        </div>
        <p className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-(--c-text-2) @min-[30rem]:mt-0">
          <FiMail className="shrink-0" aria-hidden="true" />
          <span className="truncate">{student.email || 'Sin correo'}</span>
        </p>
      </div>
      {action}
    </article>
  )
}
