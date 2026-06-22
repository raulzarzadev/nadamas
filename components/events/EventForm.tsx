'use client'
import {
  DateField,
  SelectField,
  SwitchField,
  TextAreaField,
  TextField,
} from '@comps/Inputs/FormFields'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import STATUS_EVENT from '@/CONSTANTS/STATUS_EVENT'
import { submitEvent } from '@/firebase/events'

export type EventDoc = {
  id?: string
  title?: string
  date?: number
  description?: string
  publicEvent?: boolean
  status?: string
}

const STATUS_OPTIONS = Object.entries(STATUS_EVENT as Record<string, { label: string }>).map(
  ([value, { label }]) => ({ value, label })
)

const toDateInput = (ms?: number) => (ms ? new Date(ms).toISOString().slice(0, 10) : '')

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

  const set = (patch: Partial<EventDoc>) => setForm((f) => ({ ...f, ...patch }))

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title?.trim()) return setError('El título es obligatorio')
    if (!form.date) return setError('La fecha es obligatoria')
    setSaving(true)
    setError(null)
    try {
      const res: any = await submitEvent({
        ...(event?.id ? { id: event.id } : {}),
        ...form,
      })
      if (res?.ok) {
        router.push('/athlete/progress')
        return
      }
      setError('No se pudo guardar el evento')
    } catch {
      setError('No se pudo guardar el evento')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 max-w-md mx-auto">
      <TextField
        label="Título"
        value={form.title ?? ''}
        onChange={(e) => set({ title: e.target.value })}
      />

      <DateField
        label="Fecha"
        value={toDateInput(form.date)}
        onChange={(e) =>
          set({
            date: e.target.value ? new Date(e.target.value).getTime() : undefined,
          })
        }
      />

      <TextAreaField
        label="Descripción"
        rows={3}
        value={form.description ?? ''}
        onChange={(e) => set({ description: e.target.value })}
      />

      <SelectField
        label="Estado"
        value={form.status ?? ''}
        onChange={(e) => set({ status: e.target.value })}
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </SelectField>

      <SwitchField
        label="Evento público"
        checked={!!form.publicEvent}
        onChange={(e) => set({ publicEvent: e.target.checked })}
      />

      {error && <p className="text-error text-sm">{error}</p>}

      <button className="btn btn-primary" disabled={saving} type="submit">
        {saving ? 'Guardando…' : event?.id ? 'Actualizar' : 'Crear evento'}
      </button>
    </form>
  )
}
