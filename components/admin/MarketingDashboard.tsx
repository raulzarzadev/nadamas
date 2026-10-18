'use client'
import { useEffect, useState } from 'react'
import { getAuthed, postAuthed } from '@/lib/client/authed-api'
import type { MarketingRecipient } from '@/lib/marketing'

interface Campaign {
  id: string
  subject: string
  createdAt: number
  status: string
  sent: number
  skipped: number
  failed: number
  uncertain: number
}
interface Data {
  users: MarketingRecipient[]
  ready: boolean
  sender: string
  campaigns: Campaign[]
}
const labels = {
  subscribed: 'Suscrito',
  unsubscribed: 'Se dio de baja',
  pending: 'Sin consentimiento',
}
const campaignLabels: Record<string, string> = {
  sending: 'En curso · no repetir',
  completed: 'Completada',
  partial: 'Parcial',
  interrupted: 'Interrumpida · revisar',
}
export default function MarketingDashboard() {
  const [data, setData] = useState<Data | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [review, setReview] = useState(false)
  const [requestId, setRequestId] = useState<string | null>(null)
  async function load() {
    setData(await (await getAuthed('/api/admin/marketing')).json())
  }
  useEffect(() => {
    let active = true
    getAuthed('/api/admin/marketing')
      .then((res) => res.json())
      .then((value) => {
        if (active) setData(value)
      })
      .catch(() => {
        if (active)
          setMessage('No pudimos cargar email marketing. Recarga la página para reintentar.')
      })
    return () => {
      active = false
    }
  }, [])
  const visible =
    data?.users.filter((user) =>
      `${user.name} ${user.email}`.toLowerCase().includes(query.trim().toLowerCase())
    ) || []
  const recipients = data?.users.filter((user) => selected.includes(user.id) && user.eligible) || []
  async function send() {
    if (busy || requestId) return
    const campaignId = crypto.randomUUID()
    setRequestId(campaignId)
    setBusy(true)
    setMessage('')
    try {
      const result = await (
        await postAuthed('/api/admin/marketing', {
          id: campaignId,
          subject,
          content,
          userIds: recipients.map((user) => user.id),
        })
      ).json()
      setMessage(
        `Enviados: ${result.sent}. Omitidos: ${result.skipped}. Fallidos: ${result.failed}. Sin confirmar: ${result.uncertain}.`
      )
      setSelected([])
      setReview(false)
      setRequestId(null)
    } catch {
      setMessage(
        'No pudimos confirmar el envío. Revisa el historial antes de crear otra campaña. No repitas este envío.'
      )
    } finally {
      setBusy(false)
      await load().catch(() => {})
    }
  }
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-3xl font-extrabold">Email marketing</h1>
        <p className="mt-2 text-[var(--c-text-2)]">
          Envía novedades a usuarios suscritos. Hasta 50 destinatarios por campaña.
        </p>
      </div>
      <p role="status" className="text-sm">
        {message}
      </p>
      {!data && !message && <p>Cargando usuarios…</p>}
      {data && (
        <>
          <div className="rounded-2xl border border-[var(--c-border)] bg-white p-5">
            <p>
              Remitente: <strong>{data.sender}</strong>
            </p>
            {!data.ready && (
              <p className="mt-2 text-amber-800">
                Envío pendiente de configuración y verificación del dominio de marketing.
              </p>
            )}
          </div>
          <fieldset
            disabled={busy || review || Boolean(requestId)}
            className="flex flex-col gap-4 rounded-2xl border border-[var(--c-border)] bg-white p-5"
          >
            <legend className="font-bold">1. Destinatarios</legend>
            <label>
              Buscar por nombre o correo
              <input
                type="search"
                className="input mt-1 w-full"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="btn btn-sm"
                onClick={() =>
                  setSelected(
                    [
                      ...new Set([
                        ...selected,
                        ...visible.filter((user) => user.eligible).map((user) => user.id),
                      ]),
                    ].slice(0, 50)
                  )
                }
              >
                Seleccionar suscritos visibles
              </button>
              <button type="button" className="btn btn-sm" onClick={() => setSelected([])}>
                Limpiar selección
              </button>
              <span>{recipients.length} seleccionados</span>
            </div>
            <ul className="max-h-96 divide-y divide-[var(--c-border)] overflow-auto">
              {visible.map((user) => (
                <li key={user.id} className={`py-3 ${!user.eligible ? 'opacity-50' : ''}`}>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="checkbox shrink-0"
                      disabled={
                        !user.eligible || (!selected.includes(user.id) && selected.length >= 50)
                      }
                      checked={selected.includes(user.id) && user.eligible}
                      onChange={(event) =>
                        setSelected((current) =>
                          event.target.checked
                            ? [...current, user.id]
                            : current.filter((id) => id !== user.id)
                        )
                      }
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{user.name}</span>
                      <span className="block truncate text-sm">{user.email || 'Sin correo'}</span>
                    </span>
                    <span className="text-sm">
                      {labels[user.status]}
                      {!user.eligible && user.status === 'subscribed' ? ' · No disponible' : ''}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            {visible.length === 0 && <p>No hay usuarios que coincidan.</p>}
          </fieldset>
          <fieldset
            disabled={busy || review || Boolean(requestId)}
            className="flex flex-col gap-4 rounded-2xl border border-[var(--c-border)] bg-white p-5"
          >
            <legend className="font-bold">2. Mensaje</legend>
            <label>
              Asunto
              <input
                className="input mt-1 w-full"
                maxLength={150}
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />
            </label>
            <label>
              Contenido
              <textarea
                className="textarea mt-1 min-h-48 w-full"
                maxLength={20000}
                value={content}
                onChange={(event) => setContent(event.target.value)}
              />
            </label>
            <p className="text-sm">Se incluirá automáticamente un enlace para darse de baja.</p>
          </fieldset>
          {review && (
            <section className="rounded-2xl border border-[var(--c-border)] bg-white p-5">
              <h2 className="text-xl font-bold">Revisar campaña</h2>
              <p className="my-3">
                De {data.sender} para {recipients.length} usuarios suscritos.
              </p>
              <details>
                <summary>Ver destinatarios</summary>
                <ul>
                  {recipients.map((user) => (
                    <li key={user.id}>{user.email}</li>
                  ))}
                </ul>
              </details>
              <h3 className="my-4 font-bold">{subject}</h3>
              <p className="whitespace-pre-wrap break-words">{content}</p>
              <p className="mt-6 text-sm underline">Dejar de recibir correos</p>
            </section>
          )}
          <div className="sticky bottom-(--app-tabbar-h,0px) z-10 flex flex-wrap gap-3 border-t border-[var(--c-border)] bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {review ? (
              <>
                <button
                  type="button"
                  className="btn"
                  disabled={busy || Boolean(requestId)}
                  onClick={() => setReview(false)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy || Boolean(requestId) || !data.ready}
                  onClick={send}
                >
                  {busy ? 'Enviando…' : `Enviar a ${recipients.length} usuarios`}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                disabled={!data.ready || !recipients.length || !subject.trim() || !content.trim()}
                onClick={() => {
                  setRequestId(null)
                  setReview(true)
                }}
              >
                Revisar antes de enviar
              </button>
            )}
          </div>
          <section>
            <h2 className="mb-3 text-xl font-bold">Últimas campañas</h2>
            <p className="mb-3 text-sm">
              Enviado indica que Brevo aceptó el correo. Los envíos sin confirmar requieren revisión
              en Brevo antes de repetirlos.
            </p>
            {!data.campaigns.length && <p>Aún no hay campañas.</p>}
            <ul className="divide-y divide-[var(--c-border)]">
              {data.campaigns.map((campaign) => (
                <li key={campaign.id} className="py-4">
                  <p className="font-bold">{campaign.subject}</p>
                  <p className="text-sm">
                    {new Date(campaign.createdAt).toLocaleString('es-MX')} ·{' '}
                    {campaignLabels[campaign.status] || 'Revisar'}
                  </p>
                  <p className="text-sm">
                    Enviados: {campaign.sent} · Omitidos: {campaign.skipped} · Fallidos:{' '}
                    {campaign.failed} · Sin confirmar: {campaign.uncertain}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}
