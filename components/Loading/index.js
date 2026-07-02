export default function Loading({
  size = 'sm',
  label = 'En sus marcas, listos... ¡fuera!',
  sublabel = 'Preparando tu carril.',
  fullScreen = false,
}) {
  const sizing = {
    sm: 'border-4 w-7 h-7',
    md: 'border-8 w-14 h-14',
    lg: 'border-8 w-24 h-24',
  }
  if (fullScreen) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="grid min-h-[calc(100vh-2rem)] place-items-center px-5 py-10"
      >
        <div className="flex w-full max-w-xs flex-col items-center text-center">
          <div className="relative grid h-28 w-28 place-items-center">
            <div className="absolute inset-0 rounded-full border border-[var(--c-aqua-light)] bg-[var(--c-surface)]" />
            <div
              className={`${sizing[size]} relative rounded-full border-[var(--c-aqua-strong)] border-t-0 border-b-0 border-r-0 animate-spin motion-reduce:animate-none`}
            />
            <div className="absolute h-2 w-14 rounded-full bg-[var(--c-ocean)]" />
          </div>
          <p className="mt-5 text-xl font-extrabold text-[var(--c-ocean)]">{label}</p>
          {sublabel && <p className="mt-1 text-sm text-[var(--c-text-2)]">{sublabel}</p>}
        </div>
      </div>
    )
  }
  return (
    <div className="flex justify-center items-center" role="status" aria-label={label}>
      <div
        className={`${sizing[size]} rounded-full border-[var(--c-aqua-strong)] border-t-0 border-b-0 border-r-0 animate-spin motion-reduce:animate-none`}
      ></div>
    </div>
  )
}
