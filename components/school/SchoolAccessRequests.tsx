'use client'

import { useEffect, useState } from 'react'
import { getAuthed, patchAuthed, postAuthed } from '@/lib/client/authed-api'
import type { SchoolAccessRequest } from '@/lib/school-access-request'

export function SchoolAccessRequestCard({
  schoolId,
  schoolName,
}: {
  schoolId: string
  schoolName: string
}) {
  const [status, setStatus] = useState<string>('loading')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    getAuthed(`/api/schools/${schoolId}/access-requests`)
      .then((r) => r.json())
      .then((p) => {
        if (active) setStatus(p.request?.status || 'none')
      })
      .catch(() => {
        if (active) setStatus('error')
      })
    return () => {
      active = false
    }
  }, [schoolId])
  async function send() {
    setBusy(true)
    setError('')
    try {
      const response = await postAuthed(`/api/schools/${schoolId}/access-requests`)
      const payload = await response.json()
      setStatus(payload.request.status)
    } catch {
      setError('No pudimos enviar tu solicitud. Inténtalo de nuevo o contacta a la escuela.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="grid gap-4 rounded-[var(--r-md)] border border-(--c-border) bg-white p-6 sm:p-8">
      <h1 className="text-xl font-extrabold text-(--c-ocean)">{schoolName}</h1>
      <h2 className="text-lg font-bold">
        {status === 'pending'
          ? 'Solicitud pendiente'
          : status === 'approved'
            ? 'Tu acceso fue aprobado'
            : 'Solicita acceso a esta escuela'}
      </h2>
      <p className="max-w-xl text-(--c-text-2)">
        {status === 'pending'
          ? 'Ya enviamos tu solicitud. La dirección de la escuela debe aprobarla para que puedas entrar como atleta.'
          : 'Compartirás tu perfil de atleta con esta escuela: tu nombre visible y correo. La dirección revisará tu solicitud antes de darte acceso.'}
      </p>
      {status === 'rejected' && (
        <p>
          La escuela no aprobó tu solicitud anterior. Puedes contactar a la dirección o volver a
          solicitar acceso.
        </p>
      )}
      {status === 'loading' ? (
        <p role="status">Cargando solicitud…</p>
      ) : status === 'error' || status === 'approved' ? (
        <button
          type="button"
          className="btn btn-primary justify-self-start"
          onClick={() => window.location.reload()}
        >
          {status === 'approved' ? 'Entrar a la escuela' : 'Volver a intentar'}
        </button>
      ) : status === 'pending' ? (
        <button
          type="button"
          className="btn btn-outline justify-self-start"
          onClick={() => window.location.reload()}
        >
          Revisar estado
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          className="btn btn-primary min-h-11 justify-self-start"
          onClick={() => void send()}
        >
          {busy ? 'Enviando…' : 'Solicitar acceso'}
        </button>
      )}
      {error && (
        <p role="alert" className="text-(--c-error,#b91c1c)">
          {error}
        </p>
      )}
    </section>
  )
}

export default function SchoolAccessRequests({
  schoolId,
  onApproved,
}: {
  schoolId: string
  onApproved: () => Promise<void>
}) {
  const [requests, setRequests] = useState<SchoolAccessRequest[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    setRequests([])
    setError('')
    getAuthed(`/api/schools/${schoolId}/access-requests?review=true`)
      .then((r) => r.json())
      .then((p) => {
        if (active) setRequests(p.requests || [])
      })
      .catch(() => {
        if (active) setError('No pudimos cargar las solicitudes de acceso.')
      })
    return () => {
      active = false
    }
  }, [schoolId])
  async function review(item: SchoolAccessRequest, status: 'approved' | 'rejected') {
    setBusy(item.id)
    setError('')
    try {
      await patchAuthed(`/api/schools/${schoolId}/access-requests`, { userId: item.userId, status })
      setRequests((current) => current.filter((row) => row.id !== item.id))
      if (status === 'approved') await onApproved()
    } catch {
      setError('No pudimos completar la revisión. Actualiza la página e inténtalo de nuevo.')
    } finally {
      setBusy(null)
    }
  }
  if (!requests.length && !error) return null
  return (
    <section className="grid gap-3 rounded-[var(--r-md)] border border-(--c-border) bg-white p-5">
      <h2 className="font-bold text-(--c-ocean)">Solicitudes de acceso</h2>
      {error && <p role="alert">{error}</p>}
      {requests.map((item) => (
        <article
          key={item.id}
          className="flex flex-wrap items-center justify-between gap-3 border-t border-(--c-border) pt-3"
        >
          <div className="min-w-0">
            <h3 className="font-bold break-words">{item.name}</h3>
            <p className="text-sm break-all text-(--c-text-2)">{item.email}</p>
            <p className="text-sm">Solicita unirse como atleta.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy !== null}
              className="btn btn-outline min-h-11"
              onClick={() => void review(item, 'rejected')}
            >
              Rechazar
            </button>
            <button
              type="button"
              disabled={busy !== null}
              className="btn btn-primary min-h-11"
              onClick={() => void review(item, 'approved')}
            >
              {busy === item.id ? 'Guardando…' : 'Aprobar'}
            </button>
          </div>
        </article>
      ))}
    </section>
  )
}
