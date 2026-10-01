'use client'
import Link from 'next/link'
import type { AdditionalProfile } from '@/lib/additional-profile'

export default function AdditionalProfileSelector({
  profiles,
  value,
  onChange,
}: {
  profiles: AdditionalProfile[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="grid gap-2 rounded-[var(--r-sm)] border border-(--c-border) bg-white p-4">
      <label className="grid gap-1 text-sm font-semibold">
        ¿Para quién es la invitación?
        <select
          className="min-h-11 w-full rounded-[var(--r-sm)] border border-(--c-border) bg-white px-3 font-normal focus:outline-2 focus:outline-(--c-aqua-strong)"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Mi perfil</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name} · Adicional
            </option>
          ))}
        </select>
      </label>
      <p className="text-sm text-(--c-text-2)">
        Para gestionar a otra persona adulta o menor, selecciona un Adicional.
      </p>
      <Link href="/profile" className="font-semibold underline">
        Crear Adicional en Mi perfil
      </Link>
    </div>
  )
}
