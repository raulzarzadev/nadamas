import Avatar from '@/components/ui/avatar'

export default function StudentBadge({
  name,
  avatarUrl,
}: {
  name: string
  avatarUrl?: string | null
}) {
  return (
    <span className="inline-flex w-fit max-w-full shrink-0 items-center gap-1.5 rounded-full border border-[var(--c-border)] bg-white/80 px-2 py-1 text-[11px] font-semibold leading-none text-[var(--c-ocean)]">
      <span className="truncate">{name}</span>
      <Avatar name={name} src={avatarUrl} size={16} tone="white" />
    </span>
  )
}
