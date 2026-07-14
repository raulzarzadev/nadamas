'use client'

import { TextField } from '@comps/Inputs/FormFields'
import { signInWithCustomToken } from 'firebase/auth'
import { type FormEvent, useState } from 'react'
import { auth } from '@/firebase/index'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'

export default function OtpLogin({ disabled }: { disabled: boolean }) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [manualEntry, setManualEntry] = useState(false)
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
      setManualEntry(false)
      setStep('code')
      setMessage('Te enviamos un correo con un botón para entrar y un código de 6 dígitos.')
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
      if (response.status === 400) {
        setHasError(true)
        setMessage('El correo o el código no coinciden.')
        return
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
          <TextField
            label="Correo"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="tu@correo.com"
            className="h-12"
          />
          <button
            type="submit"
            disabled={disabled || busy}
            className="btn btn-primary h-12 rounded-2xl disabled:border-[var(--c-border)] disabled:bg-[var(--c-surface)] disabled:text-[var(--c-text-2)]"
          >
            {busy ? 'Enviando…' : 'Recibir código'}
          </button>
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => {
              setManualEntry(true)
              setStep('code')
              setMessage(null)
              setHasError(false)
            }}
            className="text-sm font-semibold text-[var(--c-ocean-mid)]"
          >
            ¿Ya tienes un código?
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="flex flex-col gap-3">
          {manualEntry && (
            <TextField
              label="Correo"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@correo.com"
              className="h-12"
            />
          )}
          <TextField
            label={manualEntry ? 'Código' : `Código enviado a ${email}`}
            inputMode="numeric"
            required
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            autoComplete="one-time-code"
            className="h-12 text-center text-lg tracking-[0.45em]"
          />
          <button
            type="submit"
            disabled={
              busy ||
              code.length !== 6 ||
              (manualEntry && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
            }
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
            hasError ? 'bg-red-50 text-red-700' : 'bg-[var(--c-surface)] text-[var(--c-text-2)]'
          }`}
        >
          {message}
        </p>
      )}
    </div>
  )
}
