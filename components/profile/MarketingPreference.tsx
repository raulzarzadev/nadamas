'use client'
import { useEffect, useState } from 'react'
import { getAuthed, patchAuthed } from '@/lib/client/authed-api'
import type { MarketingRecipient } from '@/lib/marketing'
export default function MarketingPreference() {
  const [preference, setPreference] = useState<MarketingRecipient | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => {
    let active = true
    getAuthed('/api/marketing/preferences')
      .then((res) => res.json())
      .then((data) => {
        if (active) setPreference(data)
      })
      .catch(() => {
        if (active) setMessage('No pudimos cargar tu preferencia.')
      })
    return () => {
      active = false
    }
  }, [])
  async function toggle() {
    if (!preference) return
    setBusy(true)
    setMessage('')
    try {
      await patchAuthed('/api/marketing/preferences', {
        subscribed: preference.status !== 'subscribed',
      })
      setPreference(await (await getAuthed('/api/marketing/preferences')).json())
      setMessage('Preferencia guardada.')
    } catch {
      setMessage('No pudimos guardar. Verifica tu correo e inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="rounded-2xl border border-[var(--c-border)] bg-white p-5">
      <h2 className="text-lg font-bold">Novedades por correo</h2>
      <p className="my-3 text-sm">
        Quiero recibir novedades y promociones de Nadamas. Puedo darme de baja cuando quiera.
      </p>
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          className="checkbox"
          checked={preference?.status === 'subscribed'}
          disabled={!preference || busy}
          onChange={toggle}
        />
        Recibir novedades y promociones
      </label>
      <p className="mt-3 text-sm" role="status">
        {message}
      </p>
    </section>
  )
}
