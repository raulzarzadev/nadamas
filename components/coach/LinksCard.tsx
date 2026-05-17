'use client'
import { useState } from 'react'
import type {
  CoachSocial,
  CoachYoutubeLink,
} from '@/firebase/coaches/coach.model'

interface LinksValue {
  bio?: string
  socials?: CoachSocial[]
  youtubeLinks?: CoachYoutubeLink[]
}

export default function LinksCard({
  value,
  saving,
  onSave,
}: {
  value: LinksValue
  saving: boolean
  onSave: (v: LinksValue) => void
}) {
  const [draft, setDraft] = useState<LinksValue>(value || {})

  const socials = draft.socials || []
  const yts = draft.youtubeLinks || []

  return (
    <section className="rounded-[var(--r-md)] bg-white border border-[var(--c-border)] shadow-[var(--shadow-sm)] p-6 flex flex-col gap-4">
      <h2 className="text-xl font-bold text-[var(--c-ocean-mid)]">
        Presentación y enlaces
      </h2>

      <label className="form-control">
        <span className="label-text text-[var(--c-text-2)]">Bio</span>
        <textarea
          className="textarea textarea-bordered"
          rows={3}
          value={draft.bio || ''}
          onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
        />
      </label>

      <div className="flex flex-col gap-2">
        <span className="label-text text-[var(--c-text-2)]">Redes sociales</span>
        {socials.map((s, i) => (
          <div key={i} className="flex gap-2">
            <input
              className="input input-bordered w-1/3"
              placeholder="Tipo (instagram…)"
              value={s.type}
              onChange={(e) =>
                setDraft((d) => {
                  const next = [...(d.socials || [])]
                  next[i] = { ...next[i], type: e.target.value }
                  return { ...d, socials: next }
                })
              }
            />
            <input
              className="input input-bordered flex-1"
              placeholder="URL"
              value={s.url}
              onChange={(e) =>
                setDraft((d) => {
                  const next = [...(d.socials || [])]
                  next[i] = { ...next[i], url: e.target.value }
                  return { ...d, socials: next }
                })
              }
            />
            <button
              type="button"
              aria-label={`Quitar red ${i + 1}`}
              className="btn btn-ghost"
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  socials: (d.socials || []).filter((_, idx) => idx !== i),
                }))
              }
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-ghost self-start"
          onClick={() =>
            setDraft((d) => ({
              ...d,
              socials: [...(d.socials || []), { type: '', url: '' }],
            }))
          }
        >
          + Agregar red
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <span className="label-text text-[var(--c-text-2)]">
          Videos de YouTube
        </span>
        {yts.map((y, i) => (
          <div key={i} className="flex gap-2">
            <input
              className="input input-bordered flex-1"
              placeholder="URL de YouTube"
              value={y.url}
              onChange={(e) =>
                setDraft((d) => {
                  const next = [...(d.youtubeLinks || [])]
                  next[i] = { ...next[i], url: e.target.value }
                  return { ...d, youtubeLinks: next }
                })
              }
            />
            <input
              className="input input-bordered w-1/3"
              placeholder="Etiqueta (opcional)"
              value={y.label || ''}
              onChange={(e) =>
                setDraft((d) => {
                  const next = [...(d.youtubeLinks || [])]
                  next[i] = { ...next[i], label: e.target.value }
                  return { ...d, youtubeLinks: next }
                })
              }
            />
            <button
              type="button"
              aria-label={`Quitar video ${i + 1}`}
              className="btn btn-ghost"
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  youtubeLinks: (d.youtubeLinks || []).filter(
                    (_, idx) => idx !== i
                  ),
                }))
              }
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-ghost self-start"
          onClick={() =>
            setDraft((d) => ({
              ...d,
              youtubeLinks: [...(d.youtubeLinks || []), { url: '', label: '' }],
            }))
          }
        >
          + Agregar video
        </button>
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={() => onSave(draft)}
        className="btn btn-primary self-start disabled:opacity-50"
      >
        {saving ? 'Guardando…' : 'Guardar enlaces'}
      </button>
    </section>
  )
}
