'use client'
import { useEffect, useState } from 'react'
import type { AdditionalProfile } from '@/lib/additional-profile'
import { getAuthed, postAuthed } from '@/lib/client/authed-api'

export default function AdditionalProfiles() {
  const [profiles, setProfiles] = useState<AdditionalProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({ name: '', birthDate: '', gender: 'varonil' })
  useEffect(() => {
    getAuthed('/api/additional-profiles')
      .then((r) => r.json())
      .then((p) => setProfiles(p.profiles || []))
      .catch(() => setMessage('No se pudieron cargar tus Adicionales.'))
      .finally(() => setLoading(false))
  }, [])
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const response = await postAuthed('/api/additional-profiles', form)
      const { profile } = await response.json()
      setProfiles((current) => [...current, profile])
      setForm({ name: '', birthDate: '', gender: 'varonil' })
      setMessage('Adicional creado. Puedes seleccionarlo al aceptar una invitación de escuela.')
    } catch {
      setMessage('No se pudo crear el Adicional. Revisa los datos e inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }
  return (
    <section
      className="grid gap-4 rounded-[var(--r-md)] border border-(--c-border) bg-white p-5"
      aria-labelledby="additional-title"
    >
      <div>
        <h2 id="additional-title" className="text-lg font-bold">
          Adicionales
        </h2>
        <p className="mt-1 text-sm text-(--c-text-2)">
          Crea perfiles para gestionar personas adultas o menores desde tu cuenta. Cada Adicional
          tiene sus propios datos y clases.
        </p>
      </div>
      {loading ? (
        <p>Cargando Adicionales…</p>
      ) : profiles.length ? (
        <ul className="grid gap-2">
          {profiles.map((p) => (
            <li key={p.id} className="rounded-[var(--r-sm)] bg-(--c-surface) p-3">
              <strong>{p.name}</strong>
              <span className="block text-sm text-(--c-text-2)">Adicional · {p.birthDate}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-(--c-text-2)">
          Aún no tienes Adicionales. Agrega a la primera persona.
        </p>
      )}
      <form onSubmit={submit} className="grid gap-3">
        <label className="grid gap-1 text-sm font-semibold">
          Nombre completo
          <input
            required
            minLength={2}
            maxLength={120}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="min-h-11 w-full rounded-[var(--r-sm)] border border-(--c-border) bg-white px-3 font-normal focus:outline-2 focus:outline-(--c-aqua-strong)"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Fecha de nacimiento
          <input
            required
            type="date"
            value={form.birthDate}
            onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
            className="min-h-11 w-full rounded-[var(--r-sm)] border border-(--c-border) bg-white px-3 font-normal focus:outline-2 focus:outline-(--c-aqua-strong)"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Rama / género
          <select
            value={form.gender}
            onChange={(e) => setForm({ ...form, gender: e.target.value })}
            className="min-h-11 w-full rounded-[var(--r-sm)] border border-(--c-border) bg-white px-3 font-normal focus:outline-2 focus:outline-(--c-aqua-strong)"
          >
            <option value="varonil">Varonil</option>
            <option value="femenil">Femenil</option>
            <option value="otro">Otro</option>
          </select>
        </label>
        <button disabled={saving || loading} className="btn btn-primary min-h-11" type="submit">
          {saving ? 'Creando…' : 'Crear Adicional'}
        </button>
      </form>
      {message && (
        <p role="status" className="text-sm text-(--c-text-2)">
          {message}
        </p>
      )}
    </section>
  )
}
