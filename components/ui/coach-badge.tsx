import { FiCheck } from 'react-icons/fi'

export default function CoachBadge({
  name,
  unassigned = false,
  avatarOnly = false,
  selected = false,
}: {
  name: string
  unassigned?: boolean
  avatarOnly?: boolean
  selected?: boolean
}) {
  if (avatarOnly)
    return (
      <span
        role="img"
        title={name}
        aria-label={name}
        className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-[var(--c-ocean)] ${unassigned ? 'border border-current bg-transparent' : 'bg-[var(--c-aqua)]/15'}`}
      >
        {!unassigned && getInitials(name)}
      </span>
    )
  return (
    <span
      className={`inline-flex w-fit max-w-full shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-semibold leading-none ${
        selected
          ? 'border-[var(--c-ocean)] bg-[var(--c-ocean)] text-white'
          : unassigned
            ? 'border-[var(--c-border)] bg-white text-[var(--c-text-2)]'
            : 'border-[var(--c-border)] bg-white text-[var(--c-ocean)]'
      }`}
    >
      {!unassigned && (
        <span
          aria-hidden="true"
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${selected ? 'bg-white/20 text-white' : 'bg-[var(--c-aqua)]/15 text-[var(--c-ocean)]'}`}
        >
          {getInitials(name)}
        </span>
      )}
      <span className="truncate">{name}</span>
      {selected && <FiCheck aria-hidden="true" size={12} className="shrink-0" />}
    </span>
  )
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '··'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
