'use client'

import { FormEvent, useState } from 'react'
import { signInWithCustomToken } from 'firebase/auth'
import { auth } from '@/firebase/index'
import {
  GENERIC_USER_ERROR,
  reportInternalError,
} from '@/lib/user-facing-error'

export default function OtpLogin({ disabled }: { disabled: boolean }) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [hasError, setHasError] = useState(false)

  async function requestCode(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setHasError(false)
    setMessage(null)
    try {
      const response = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!response.ok) throw new Error('request_failed')
      setStep('code')
      setMessage('Te enviamos un código de 6 dígitos.')
    } catch {
      setHasError(true)
      setMessage('No pudimos enviar el código. Intenta de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setHasError(false)
    setMessage(null)
    try {
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })
      const payload = (await response.json()) as {
        customToken?: string
        error?: string
      }
      if (!response.ok || !payload.customToken) {
        throw new Error(payload.error || 'Código inválido.')
      }
      await signInWithCustomToken(auth, payload.customToken)
    } catch (error) {
      reportInternalError('OTP_LOGIN', error)
      setHasError(true)
      setMessage(GENERIC_USER_ERROR)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      {step === 'email' ? (
        <form onSubmit={requestCode} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-[var(--c-ocean)]">
              Correo
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@correo.com"
              className="input input-bordered h-12 w-full rounded-2xl bg-white"
            />
          </label>
          <button
            disabled={disabled || busy}
            className="btn h-12 rounded-2xl border-[var(--c-border)] bg-white"
          >
            {busy ? 'Enviando…' : 'Recibir código'}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-[var(--c-ocean)]">
              Código enviado a {email}
            </span>
            <input
              inputMode="numeric"
              required
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
              }
              placeholder="000000"
              maxLength={6}
              autoComplete="one-time-code"
              className="input input-bordered h-12 w-full rounded-2xl bg-white text-center text-lg tracking-[0.45em]"
            />
          </label>
          <button
            disabled={busy || code.length !== 6}
            className="btn btn-primary h-12 rounded-2xl"
          >
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setStep('email')
              setCode('')
              setMessage(null)
              setHasError(false)
            }}
            className="text-sm font-semibold text-[var(--c-ocean-mid)]"
          >
            Cambiar correo
          </button>
        </form>
      )}

      {message && (
        <p
          className={`mt-3 rounded-2xl px-3 py-2 text-sm ${
            hasError
              ? 'bg-red-50 text-red-700'
              : 'bg-[var(--c-surface)] text-[var(--c-text-2)]'
          }`}
        >
          {message}
        </p>
      )}
    </div>
  )
}
