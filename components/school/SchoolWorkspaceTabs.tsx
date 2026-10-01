'use client'

export default function SchoolWorkspaceTabs({
  schools,
  selectedId,
  description,
  personalLabel = 'Míos',
  onChange,
}: {
  schools: Array<{ id: string; name: string }>
  selectedId: string | null
  description: string
  personalLabel?: string
  onChange: (id: string | null) => void
}) {
  if (!schools.length) return null
  return (
    <section className="-mx-1 px-1">
      <div className="flex items-baseline gap-2 overflow-x-auto whitespace-nowrap">
        <h2 className="text-sm font-extrabold text-(--c-ocean)">Escuelas</h2>
        <p className="text-[11px] text-(--c-text-2)">{description}</p>
      </div>
      <nav aria-label="Seleccionar escuela" className="mt-2 flex gap-2 overflow-x-auto py-1">
        {[{ id: null, name: personalLabel }, ...schools].map(({ id, name }) => (
          <button
            key={id || 'personal'}
            type="button"
            aria-pressed={selectedId === id}
            onClick={() => onChange(id)}
            className={`min-h-11 shrink-0 rounded-[var(--r-sm)] border px-5 py-2 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong) ${
              selectedId === id
                ? 'border-(--c-ocean) bg-(--c-ocean) text-white shadow-[var(--shadow-sm)]'
                : 'border-(--c-border) bg-white text-(--c-ocean) hover:border-(--c-aqua-strong) hover:bg-(--c-surface)'
            }`}
          >
            {name}
          </button>
        ))}
      </nav>
    </section>
  )
}
