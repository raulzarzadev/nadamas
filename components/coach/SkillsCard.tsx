'use client'
import { useState } from 'react'
import COACH_SKILLS from '@/CONSTANTS/COACH_SKILLS'

export default function SkillsCard({
  value,
  saving,
  onSave,
}: {
  value: Record<string, string>
  saving: boolean
  onSave: (skills: Record<string, string>) => void
}) {
  const [draft, setDraft] = useState<Record<string, string>>(value || {})

  return (
    <section className="rounded-[var(--r-md)] bg-white border border-[var(--c-border)] shadow-[var(--shadow-sm)] p-6 flex flex-col gap-4">
      <h2 className="text-xl font-bold text-[var(--c-ocean-mid)]">
        Carta de habilidades
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {COACH_SKILLS.map((dim) => (
          <label key={dim.key} className="form-control">
            <span className="label-text text-[var(--c-text-2)]">
              {dim.label}
            </span>
            <select
              className="select select-bordered"
              value={draft[dim.key] || ''}
              onChange={(e) =>
                setDraft((d) => ({ ...d, [dim.key]: e.target.value }))
              }
            >
              <option value="">—</option>
              {dim.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <button
        type="button"
        disabled={saving}
        onClick={() => onSave(draft)}
        className="btn btn-primary self-start disabled:opacity-50"
      >
        {saving ? 'Guardando…' : 'Guardar carta'}
      </button>
    </section>
  )
}
