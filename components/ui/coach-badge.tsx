export default function CoachBadge({
  name,
  unassigned = false,
}: {
  name: string
  unassigned?: boolean
}) {
  return (
    <span
      className={`inline-flex w-fit max-w-full shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-semibold leading-none ${
        unassigned
          ? 'border-[var(--c-border)] bg-transparent text-[var(--c-text-2)]'
          : 'border-[var(--c-border)] bg-white/80 text-[var(--c-ocean)]'
      }`}
    >
      {!unassigned && (
        <span
          aria-hidden="true"
          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--c-aqua)]/15 text-[9px] font-bold text-[var(--c-ocean)]"
        >
          {getInitials(name)}
        </span>
      )}
      <span className="truncate">{name}</span>
    </span>
  )
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '··'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
