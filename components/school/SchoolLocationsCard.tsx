'use client'

import { useEffect, useState } from 'react'
import { FiMapPin, FiPlus, FiTrash2 } from 'react-icons/fi'
import { deleteAuthed, getAuthed, postAuthed } from '@/lib/client/authed-api'
import type { SchoolLocation } from '@/lib/school'

export default function SchoolLocationsCard({
  schoolId,
  canManage,
}: {
  schoolId: string
  canManage: boolean
}) {
  const [locations, setLocations] = useState<SchoolLocation[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', address: '', mapUrl: '' })
  const [message, setMessage] = useState<string | null>(null)
  useEffect(() => {
    getAuthed(`/api/schools/${schoolId}/locations`)
      .then((response) => response.json() as Promise<{ locations?: SchoolLocation[] }>)
      .then((payload) => setLocations(payload.locations || []))
      .catch(() => setMessage('No se pudieron cargar las instalaciones.'))
  }, [schoolId])
  async function create(event: React.FormEvent) {
    event.preventDefault()
    try {
      const response = await postAuthed(`/api/schools/${schoolId}/locations`, form)
      const payload = (await response.json()) as { location: SchoolLocation }
      setLocations((current) =>
        [...current, payload.location].sort((a, b) => a.name.localeCompare(b.name))
      )
      setForm({ name: '', address: '', mapUrl: '' })
      setOpen(false)
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'No se pudo crear la instalación.')
    }
  }
  async function remove(id: string) {
    try {
      await deleteAuthed(`/api/schools/${schoolId}/locations/${id}`)
      setLocations((current) => current.filter((location) => location.id !== id))
    } catch {
      setMessage('No se pudo eliminar la instalación.')
    }
  }
  return (
    <section className="rounded-[var(--r-md)] border border-(--c-border) bg-white p-5 shadow-[var(--shadow-sm)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-(--c-surface) text-(--c-ocean-mid)">
            <FiMapPin aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-bold text-(--c-ocean)">Instalaciones</h2>
            <p className="mt-1 text-sm text-(--c-text-2)">
              Catálogo de lugares para asignar a las clases.
            </p>
          </div>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="btn btn-outline btn-sm gap-1"
          >
            <FiPlus aria-hidden="true" /> Agregar
          </button>
        )}
      </div>
      {locations.length > 0 && (
        <div className="mt-4 grid gap-2">
          {locations.map((location) => (
            <div
              key={location.id}
              className="flex items-center justify-between gap-3 rounded-[var(--r-sm)] bg-(--c-surface) px-3 py-2 text-sm"
            >
              <div>
                <p className="font-semibold text-(--c-ocean)">{location.name}</p>
                {location.address && (
                  <p className="text-xs text-(--c-text-2)">{location.address}</p>
                )}
                {location.mapUrl && (
                  <a
                    href={location.mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-xs font-semibold text-(--c-ocean-mid)"
                  >
                    Ver mapa
                  </a>
                )}
              </div>
              {canManage && (
                <button
                  type="button"
                  onClick={() => void remove(location.id)}
                  aria-label={`Eliminar ${location.name}`}
                  className="text-(--c-error,#b91c1c)"
                >
                  <FiTrash2 aria-hidden="true" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {open && (
        <form onSubmit={create} className="mt-4 grid gap-3 border-t border-(--c-border) pt-4">
          <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
            Nombre
            <input
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="min-h-10 rounded-[var(--r-sm)] border border-(--c-border) px-3 font-normal"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
            Dirección
            <input
              value={form.address}
              onChange={(event) => setForm({ ...form, address: event.target.value })}
              className="min-h-10 rounded-[var(--r-sm)] border border-(--c-border) px-3 font-normal"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
            Enlace de ubicación
            <input
              type="url"
              value={form.mapUrl}
              onChange={(event) => setForm({ ...form, mapUrl: event.target.value })}
              placeholder="https://maps.google.com/…"
              className="min-h-10 rounded-[var(--r-sm)] border border-(--c-border) px-3 font-normal"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn btn-outline min-h-10 flex-1"
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary min-h-10 flex-1">
              Guardar
            </button>
          </div>
        </form>
      )}
      {message && <p className="mt-3 text-sm text-(--c-text-2)">{message}</p>}
    </section>
  )
}
