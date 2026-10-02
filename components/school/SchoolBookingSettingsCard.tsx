'use client'

import { useState } from 'react'
import { patchAuthed } from '@/lib/client/authed-api'
import type { SchoolBookingMode } from '@/lib/school'

export default function SchoolBookingSettingsCard({
  schoolId,
  mode,
  onChange,
}: {
  schoolId: string
  mode: SchoolBookingMode
  onChange: (mode: SchoolBookingMode) => void
}) {
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  async function change(nextMode: SchoolBookingMode) {
    setSaving(true)
    setMessage(null)
    try {
      await patchAuthed(`/api/schools/${schoolId}/settings`, { bookingMode: nextMode })
      onChange(nextMode)
      setMessage('Configuración guardada.')
    } catch {
      setMessage('No se pudo guardar la configuración.')
    } finally {
      setSaving(false)
    }
  }
  return (
    <section className="rounded-[var(--r-md)] border border-(--c-border) bg-white p-5 shadow-[var(--shadow-sm)]">
      <h2 className="font-bold text-(--c-ocean)">Configuración de reservas</h2>
      <p className="mt-1 text-sm text-(--c-text-2)">
        Define cómo se confirman las reservas de la escuela.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void change('direct')}
          className={`rounded-[var(--r-sm)] border p-3 text-left text-sm ${mode === 'direct' ? 'border-(--c-ocean) bg-(--c-surface)' : 'border-(--c-border)'}`}
        >
          <strong className="block text-(--c-ocean)">Reservar directamente</strong>
          <span className="mt-1 block text-(--c-text-2)">
            La reserva se agrega al horario de inmediato.
          </span>
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void change('request')}
          className={`rounded-[var(--r-sm)] border p-3 text-left text-sm ${mode === 'request' ? 'border-(--c-ocean) bg-(--c-surface)' : 'border-(--c-border)'}`}
        >
          <strong className="block text-(--c-ocean)">Esperar confirmación para reservar</strong>
          <span className="mt-1 block text-(--c-text-2)">
            La escuela revisa la solicitud antes de confirmar el horario.
          </span>
        </button>
      </div>
      {message && <p className="mt-3 text-xs text-(--c-text-2)">{message}</p>}
    </section>
  )
}
