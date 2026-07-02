'use client'

import { useEffect, useState } from 'react'
import { FiBell, FiBellOff } from 'react-icons/fi'
import {
  canUsePushNotifications,
  getPushSubscription,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from '@/lib/client/push-notifications'

type PushState = 'unsupported' | 'off' | 'on' | 'denied' | 'busy'

export default function PushNotificationsControl() {
  const [state, setState] = useState<PushState>('unsupported')

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

  const enabled = state === 'on'
  const denied = state === 'denied'

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={state === 'busy' || denied}
      className="flex w-full items-center justify-between gap-3 rounded-[var(--r-sm)] px-3 py-2 text-left text-sm font-semibold text-[var(--c-ocean)] transition hover:bg-[var(--c-surface)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="flex items-center gap-2">
        {enabled ? <FiBellOff aria-hidden="true" /> : <FiBell aria-hidden="true" />}
        {denied
          ? 'Permiso bloqueado'
          : enabled
            ? 'Desactivar avisos del teléfono'
            : 'Activar avisos del teléfono'}
      </span>
      {state === 'busy' && <span className="text-xs text-[var(--c-text-2)]">...</span>}
    </button>
  )
}
