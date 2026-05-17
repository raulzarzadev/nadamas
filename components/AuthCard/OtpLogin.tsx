'use client'

import { FormEvent, useState } from 'react'
import { signInWithCustomToken } from 'firebase/auth'
import { auth } from '@/firebase'

export default function OtpLogin({ disabled }: { disabled: boolean }) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function requestCode(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    const response = await fetch('/api/auth/otp/request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setBusy(false)
    if (!response.ok) {
      setMessage('No pudimos enviar el código.')
      return
    }
    setStep('code')
    setMessage('Te enviamos un código de 6 dígitos.')
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
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
      setBusy(false)
      setMessage(payload.error || 'Código inválido.')
      return
    }
    await signInWithCustomToken(auth, payload.customToken)
    setBusy(false)
  }

  return (
    <div className="mt-5 border-t border-[var(--c-border)] pt-5">
      <p className="mb-3 text-sm font-semibold text-[var(--c-text-2)]">
        O entra con tu correo
      </p>
      {step === 'email' ? (
        <form onSubmit={requestCode} className="flex flex-col gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="tu@correo.com"
            className="input input-bordered w-full"
          />
          <button disabled={disabled || busy} className="btn btn-outline">
            {busy ? 'Enviando…' : 'Enviar código'}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="flex flex-col gap-3">
          <input
            inputMode="numeric"
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="123456"
            maxLength={6}
            className="input input-bordered w-full tracking-[0.35em]"
          />
          <button disabled={busy} className="btn btn-primary">
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
          <button
            type="button"
            onClick={() => setStep('email')}
            className="text-sm font-semibold text-[var(--c-ocean-mid)]"
          >
            Cambiar correo
          </button>
        </form>
      )}
      {message && <p className="mt-3 text-sm text-[var(--c-text-2)]">{message}</p>}
    </div>
  )
}
