'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitEvent } from '@/firebase/events'
import STATUS_EVENT from '@/CONSTANTS/STATUS_EVENT'

export type EventDoc = {
  id?: string
  title?: string
  date?: number
  description?: string
  publicEvent?: boolean
  status?: string
}

const STATUS_OPTIONS = Object.entries(
  STATUS_EVENT as Record<string, { label: string }>
).map(([value, { label }]) => ({ value, label }))

const toDateInput = (ms?: number) =>
  ms ? new Date(ms).toISOString().slice(0, 10) : ''

export default function EventForm({ event }: { event?: EventDoc }) {
  const router = useRouter()
  const [form, setForm] = useState<EventDoc>({
    title: event?.title ?? '',
    date: event?.date,
    description: event?.description ?? '',
    publicEvent: event?.publicEvent ?? false,
    status: event?.status ?? STATUS_OPTIONS[0]?.value,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (patch: Partial<EventDoc>) =>
    setForm((f) => ({ ...f, ...patch }))

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title?.trim()) return setError('El título es obligatorio')
    setSaving(true)
    setError(null)
    const res: any = await submitEvent({
      ...(event?.id ? { id: event.id } : {}),
      ...form,
    })
    setSaving(false)
    if (res?.ok) {
      router.push('/events')
    } else {
      setError('No se pudo guardar el evento')
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 max-w-md mx-auto">
      <label className="form-control">
        <span className="label-text">Título</span>
        <input
          className="input input-bordered"
          value={form.title ?? ''}
          onChange={(e) => set({ title: e.target.value })}
        />
      </label>

      <label className="form-control">
        <span className="label-text">Fecha</span>
        <input
          type="date"
          className="input input-bordered"
          value={toDateInput(form.date)}
          onChange={(e) =>
            set({
              date: e.target.value
                ? new Date(e.target.value).getTime()
                : undefined,
            })
          }
        />
      </label>

      <label className="form-control">
        <span className="label-text">Descripción</span>
        <textarea
          className="textarea textarea-bordered"
          rows={3}
          value={form.description ?? ''}
          onChange={(e) => set({ description: e.target.value })}
        />
      </label>

      <label className="form-control">
        <span className="label-text">Estado</span>
        <select
          className="select select-bordered"
          value={form.status ?? ''}
          onChange={(e) => set({ status: e.target.value })}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="label cursor-pointer justify-start gap-3">
        <input
          type="checkbox"
          className="toggle"
          checked={!!form.publicEvent}
          onChange={(e) => set({ publicEvent: e.target.checked })}
        />
        <span className="label-text">Evento público</span>
      </label>

      {error && <p className="text-error text-sm">{error}</p>}

      <button className="btn btn-primary" disabled={saving} type="submit">
        {saving ? 'Guardando…' : event?.id ? 'Actualizar' : 'Crear evento'}
      </button>
    </form>
  )
}
