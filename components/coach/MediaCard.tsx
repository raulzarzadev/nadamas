'use client'
import { useState } from 'react'
import { CoachCRUD } from '@/firebase/coaches/main'
import type { CoachPhoto } from '@/firebase/coaches/coach.model'

interface MediaValue {
  facePhoto?: CoachPhoto
  workplacePhotos?: CoachPhoto[]
  achievementPhotos?: CoachPhoto[]
}

export default function MediaCard({
  uid,
  value,
  saving,
  onSave,
}: {
  uid: string
  value: MediaValue
  saving: boolean
  onSave: (v: MediaValue) => void
}) {
  const [draft, setDraft] = useState<MediaValue>(value || {})
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const upload = (file: File, apply: (url: string) => void, tag: string) => {
    setError(null)
    setBusy(tag)
    CoachCRUD.uploadAsset({ file, uid, scope: 'public' }, (p, url) => {
      if (url) {
        apply(url)
        setBusy(null)
      }
    })
    // Surface a hard failure if the upload never reports a URL.
    setTimeout(() => {
      setBusy((b) => {
        if (b === tag) setError('No se pudo subir la imagen. Intenta de nuevo.')
        return b === tag ? null : b
      })
    }, 30000)
  }

  return (
    <section className="rounded-[var(--r-md)] bg-white border border-[var(--c-border)] shadow-[var(--shadow-sm)] p-6 flex flex-col gap-4">
      <h2 className="text-xl font-bold text-[var(--c-ocean-mid)]">
        Fotos
      </h2>
      {error && <p className="text-[var(--c-error,#b91c1c)] text-sm">{error}</p>}

      <div className="flex flex-col gap-2">
        <span className="label-text text-[var(--c-text-2)]">
          Foto de tu cara
        </span>
        {draft.facePhoto?.url && (
          <img
            src={draft.facePhoto.url}
            alt="Foto de cara"
            className="w-24 h-24 object-cover rounded-full border border-[var(--c-border)]"
          />
        )}
        <input
          type="file"
          accept="image/*"
          className="file-input file-input-bordered"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f)
              upload(
                f,
                (url) => setDraft((d) => ({ ...d, facePhoto: { url } })),
                'face'
              )
          }}
        />
      </div>

      <MultiPhoto
        label="Lugares de trabajo"
        photos={draft.workplacePhotos || []}
        busy={busy === 'workplace'}
        onAdd={(f) =>
          upload(
            f,
            (url) =>
              setDraft((d) => ({
                ...d,
                workplacePhotos: [...(d.workplacePhotos || []), { url }],
              })),
            'workplace'
          )
        }
        onRemove={(i) =>
          setDraft((d) => ({
            ...d,
            workplacePhotos: (d.workplacePhotos || []).filter(
              (_, idx) => idx !== i
            ),
          }))
        }
      />

      <MultiPhoto
        label="Logros"
        photos={draft.achievementPhotos || []}
        busy={busy === 'achievement'}
        onAdd={(f) =>
          upload(
            f,
            (url) =>
              setDraft((d) => ({
                ...d,
                achievementPhotos: [...(d.achievementPhotos || []), { url }],
              })),
            'achievement'
          )
        }
        onRemove={(i) =>
          setDraft((d) => ({
            ...d,
            achievementPhotos: (d.achievementPhotos || []).filter(
              (_, idx) => idx !== i
            ),
          }))
        }
      />

      <button
        type="button"
        disabled={saving || !!busy}
        onClick={() => onSave(draft)}
        className="btn btn-primary self-start disabled:opacity-50"
      >
        {saving ? 'Guardando…' : 'Guardar fotos'}
      </button>
    </section>
  )
}

function MultiPhoto({
  label,
  photos,
  busy,
  onAdd,
  onRemove,
}: {
  label: string
  photos: CoachPhoto[]
  busy: boolean
  onAdd: (f: File) => void
  onRemove: (i: number) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="label-text text-[var(--c-text-2)]">{label}</span>
      <div className="flex flex-wrap gap-2">
        {photos.map((p, i) => (
          <div key={p.url + i} className="relative">
            <img
              src={p.url}
              alt={label}
              className="w-20 h-20 object-cover rounded-[var(--r-sm)] border border-[var(--c-border)]"
            />
            <button
              type="button"
              aria-label="Quitar"
              onClick={() => onRemove(i)}
              className="absolute -top-2 -right-2 bg-[var(--c-ocean)] text-white rounded-full w-5 h-5 text-xs"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <input
        type="file"
        accept="image/*"
        disabled={busy}
        className="file-input file-input-bordered"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onAdd(f)
        }}
      />
    </div>
  )
}
