'use client'

import type { SchoolAccessClient } from './useSchoolSelection'

export default function SchoolSelector({
  schools,
  selectedId,
  onChange,
}: {
  schools: SchoolAccessClient[]
  selectedId: string
  onChange: (id: string) => void
}) {
  if (schools.length <= 1) return null
  return (
    <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-(--c-text-2)">
      Escuela activa
      <select
        value={selectedId}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 rounded-[var(--r-sm)] border border-(--c-border) bg-white px-3 text-sm font-semibold normal-case tracking-normal text-(--c-ocean)"
      >
        {schools.map(({ school }) => (
          <option key={school.id} value={school.id}>
            {school.name}
          </option>
        ))}
      </select>
    </label>
  )
}
