'use client'

import { useEffect, useState } from 'react'
import ProfileBioCard from '@/components/profile/ProfileBioCard'
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
    <ProfileBioCard
      id="coach-bio-title"
      title="Bio del entrenador"
      value={bio}
      onChange={setBio}
      maxLength={180}
      placeholder="Una línea sobre cómo entrenas (se muestra en tu perfil público)."
      status={saving ? 'saving' : status}
      onSaveNow={saveNow}
    />
  )
}
