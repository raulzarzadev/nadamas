type AvatarTone = 'ocean' | 'white'

export function initialsOf(name?: string | null) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  const initials = `${parts[0]?.[0] || ''}${parts[1]?.[0] || ''}`.toUpperCase()
  return initials || '··'
}

export default function Avatar({
  name,
  src,
  size = 42,
  tone = 'ocean',
}: {
  name?: string | null
  src?: string | null
  size?: number
  tone?: AvatarTone
}) {
  const dimension = { width: size, height: size }

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        style={dimension}
        className="shrink-0 rounded-full border border-[var(--c-border)] object-cover"
      />
    )
  }

  const oceanClasses = 'bg-[image:var(--grad-brand)] text-white'
  const whiteClasses = 'bg-white text-[var(--c-ocean)] shadow-[inset_0_0_0_2px_var(--c-border)]'

  return (
    <span
      aria-hidden="true"
      style={{ ...dimension, fontSize: size * 0.36 }}
      className={`grid shrink-0 place-items-center rounded-full font-bold tracking-wide ${
        tone === 'ocean' ? oceanClasses : whiteClasses
      }`}
    >
      {initialsOf(name)}
    </span>
  )
}
