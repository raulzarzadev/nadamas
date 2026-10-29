'use client'

import SaveButton from '@comps/SaveButton'
import { useEffect, useState } from 'react'
import { useAutosave } from '@/hooks/useAutosave'

/** "Bio del entrenador" for /profile's Entrenador tab; same field as LinksCard's bio. */
export default function CoachBioCard({
  value,
  saving,
  onSave,
}: {
  value?: string
  saving: boolean
  onSave: (bio: string) => void
}) {
  const [bio, setBio] = useState(value || '')
  useEffect(() => setBio(value || ''), [value])
  const { status, saveNow } = useAutosave(bio, () => onSave(bio.trim()))
  return (
    <section
      aria-labelledby="coach-bio-title"
      className="flex flex-col gap-3 bg-white px-4 py-5 sm:rounded-[var(--r-md)] sm:border sm:border-[var(--c-border)] sm:p-6 sm:shadow-[var(--shadow-sm)]"
    >
      <h2 id="coach-bio-title" className="text-lg font-bold">
        Bio del entrenador
      </h2>
      <textarea
        aria-labelledby="coach-bio-title"
        value={bio}
        onChange={(event) => setBio(event.target.value)}
        placeholder="Una línea sobre cómo entrenas (se muestra en tu perfil público)."
        rows={3}
        maxLength={180}
        className="rounded-[var(--r-sm)] border border-[var(--c-border)] bg-white px-3 py-2 text-sm text-[var(--c-ocean)] outline-none transition focus:border-[var(--c-aqua)] focus:ring-4 focus:ring-[rgba(0,180,216,0.16)]"
      />
      <SaveButton
        status={saving ? 'saving' : status}
        onClick={saveNow}
        idleLabel="Guardado"
        savedLabel="Guardado"
      />
    </section>
  )
}
