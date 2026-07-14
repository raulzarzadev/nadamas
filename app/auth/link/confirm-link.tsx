'use client'

import { TextField } from '@comps/Inputs/FormFields'
import { signInWithCustomToken } from 'firebase/auth'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import { auth } from '@/firebase/index'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'

type Status = 'idle' | 'verifying' | 'success' | 'error'

export default function ConfirmLink() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const linkEmail = (searchParams.get('email') || '').trim().toLowerCase()
  const token = (searchParams.get('token') || '').trim()

  const [status, setStatus] = useState<Status>(linkEmail && token ? 'idle' : 'error')
  const [bookingCompleted, setBookingCompleted] = useState(false)
  const [fallbackEmail, setFallbackEmail] = useState(linkEmail)
  const [fallbackCode, setFallbackCode] = useState('')
  const [fallbackBusy, setFallbackBusy] = useState(false)
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null)

  async function finishLogin(customToken: string, completed: boolean) {
    setBookingCompleted(completed)
    await signInWithCustomToken(auth, customToken)
    setStatus('success')
    router.replace('/athlete/bookings')
  }

  async function confirmLink() {
    setStatus('verifying')
    try {
      const response = await fetch('/api/auth/otp/verify-link', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: linkEmail, token }),
      })
      const payload = (await response.json()) as {
        customToken?: string
        bookingCompleted?: boolean
      }
      if (!response.ok || !payload.customToken) throw new Error('link_invalid')
      await finishLogin(payload.customToken, Boolean(payload.bookingCompleted))
    } catch (error) {
      reportInternalError('OTP_LINK', error)
      setStatus('error')
    }
  }

  async function verifyFallbackCode(event: FormEvent) {
    event.preventDefault()
    setFallbackBusy(true)
    setFallbackMessage(null)
    try {
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: fallbackEmail, code: fallbackCode }),
      })
      const payload = (await response.json()) as {
        customToken?: string
        bookingCompleted?: boolean
      }
      if (response.status === 400) {
        setFallbackMessage('El correo o el código no coinciden.')
        return
      }
      if (!response.ok || !payload.customToken) throw new Error('code_invalid')
      await finishLogin(payload.customToken, Boolean(payload.bookingCompleted))
    } catch (error) {
      reportInternalError('OTP_LINK_CODE', error)
      setFallbackMessage(GENERIC_USER_ERROR)
    } finally {
      setFallbackBusy(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--c-surface)] px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-[var(--c-border)] bg-white p-6 shadow-sm">
        <p className="text-sm font-bold text-[var(--c-ocean-mid)]">nadamas.app</p>

        {status === 'success' ? (
          <>
            <h1 className="mt-2 text-2xl font-bold text-[var(--c-ocean)]">
              {bookingCompleted ? '¡Listo! Tu clase quedó agendada.' : '¡Listo! Ya entraste.'}
            </h1>
            <p className="mt-3 text-[var(--c-text-2)]">Te llevamos a tus clases…</p>
          </>
        ) : status === 'error' ? (
          <>
            <h1 className="mt-2 text-2xl font-bold text-[var(--c-ocean)]">
              Este enlace ya no es válido
            </h1>
            <p className="mt-3 text-[var(--c-text-2)]">
              Puede que haya vencido o ya se haya usado. Si tienes un código de 6 dígitos, escríbelo
              aquí:
            </p>
            <form onSubmit={verifyFallbackCode} className="mt-4 flex flex-col gap-3">
              <TextField
                label="Correo"
                type="email"
                required
                value={fallbackEmail}
                onChange={(event) => setFallbackEmail(event.target.value)}
                placeholder="tu@correo.com"
                className="h-12"
              />
              <TextField
                label="Código"
                inputMode="numeric"
                required
                value={fallbackCode}
                onChange={(event) =>
                  setFallbackCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                }
                placeholder="000000"
                maxLength={6}
                autoComplete="one-time-code"
                className="h-12 text-center text-lg tracking-[0.45em]"
              />
              <button
                type="submit"
                disabled={
                  fallbackBusy ||
                  fallbackCode.length !== 6 ||
                  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fallbackEmail)
                }
                className="btn btn-primary h-12 rounded-2xl"
              >
                {fallbackBusy ? 'Entrando…' : 'Entrar con código'}
              </button>
            </form>
            {fallbackMessage && (
              <p className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700">
                {fallbackMessage}
              </p>
            )}
            <Link
              href="/login"
              className="mt-4 block text-center text-sm font-semibold text-[var(--c-ocean-mid)]"
            >
              Pedir un código nuevo
            </Link>
          </>
        ) : (
          <>
            <h1 className="mt-2 text-2xl font-bold text-[var(--c-ocean)]">Confirma tu acceso</h1>
            <p className="mt-3 text-[var(--c-text-2)]">
              Vas a entrar a Nadamas como <span className="font-semibold">{linkEmail}</span>.
            </p>
            <button
              type="button"
              onClick={confirmLink}
              disabled={status === 'verifying'}
              className="btn btn-primary mt-5 h-14 w-full rounded-2xl text-lg"
            >
              {status === 'verifying' ? 'Entrando…' : 'Confirmar'}
            </button>
          </>
        )}
      </div>
    </main>
  )
}
