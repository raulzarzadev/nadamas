'use client'

import { useEffect, useState } from 'react'
import { FiBell, FiBellOff } from 'react-icons/fi'
import {
  canUsePushNotifications,
  getPushSubscription,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from '@/lib/client/push-notifications'
import { postAuthed } from '@/lib/client/authed-api'

type PushState = 'unsupported' | 'off' | 'on' | 'denied' | 'busy'
type TestState = 'idle' | 'sending' | 'sent' | 'error'

export default function PushNotificationsControl({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<PushState>('unsupported')
  const [testState, setTestState] = useState<TestState>('idle')

  useEffect(() => {
    if (!canUsePushNotifications()) {
      setState('unsupported')
      return
    }
    if (Notification.permission === 'denied') {
      setState('denied')
      return
    }
    getPushSubscription()
      .then((subscription) => setState(subscription ? 'on' : 'off'))
      .catch(() => setState('off'))
  }, [])

  if (state === 'unsupported') return null

  const toggle = async () => {
    if (state === 'denied' || state === 'busy') return
    const previous = state
    setState('busy')
    setTestState('idle')
    try {
      if (previous === 'on') {
        await unsubscribeFromPushNotifications()
        setState('off')
        return
      }
      await subscribeToPushNotifications()
      setState('on')
    } catch {
      setState(Notification.permission === 'denied' ? 'denied' : previous)
    }
  }

  const sendTest = async () => {
    if (state !== 'on' || testState === 'sending') return
    setTestState('sending')
    try {
      await postAuthed('/api/push-subscriptions/test')
      setTestState('sent')
    } catch {
      setTestState('error')
    }
  }

  const enabled = state === 'on'
  const denied = state === 'denied'
  const label = denied ? 'Bloqueado' : enabled ? 'Desactivar' : 'Activar'
  const icon = enabled ? <FiBellOff aria-hidden="true" /> : <FiBell aria-hidden="true" />
  const testLabel = testState === 'sending' ? '...' : testState === 'sent' ? 'Enviada' : 'Probar'

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={toggle}
          disabled={state === 'busy' || denied}
          aria-label={`${label} avisos`}
          className="inline-flex h-7 items-center gap-1 rounded-full border border-[var(--c-border)] bg-white px-2 text-[11px] font-bold leading-none text-[var(--c-ocean)] transition hover:bg-[var(--c-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state === 'busy' ? '...' : label}
          <span className="[&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>
        </button>
        {enabled && (
          <button
            type="button"
            onClick={sendTest}
            disabled={testState === 'sending'}
            aria-label="Enviar notificación de prueba"
            className="inline-flex h-7 items-center rounded-full border border-[var(--c-border)] bg-white px-2 text-[11px] font-bold leading-none text-[var(--c-aqua-strong)] transition hover:bg-[var(--c-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {testLabel}
          </button>
        )}
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={state === 'busy' || denied}
        className="flex w-full items-center justify-between gap-3 rounded-[var(--r-sm)] px-3 py-2 text-left text-sm font-semibold text-[var(--c-ocean)] transition hover:bg-[var(--c-surface)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="flex items-center gap-2">
          {icon}
          {denied ? 'Permiso bloqueado' : enabled ? 'Desactivar avisos' : 'Activar avisos'}
        </span>
        {state === 'busy' && <span className="text-xs text-[var(--c-text-2)]">...</span>}
      </button>
      {enabled && (
        <button
          type="button"
          onClick={sendTest}
          disabled={testState === 'sending'}
          className="flex w-full items-center justify-between gap-3 rounded-[var(--r-sm)] px-3 py-2 text-left text-sm font-semibold text-[var(--c-aqua-strong)] transition hover:bg-[var(--c-surface)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span>Enviar prueba</span>
          <span className="text-xs text-[var(--c-text-2)]">{testLabel}</span>
        </button>
      )}
      {testState === 'error' && (
        <p className="px-3 text-xs text-red-600">No se pudo enviar la prueba.</p>
      )}
    </div>
  )
}
