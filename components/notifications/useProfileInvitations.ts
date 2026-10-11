'use client'

import { useEffect, useState } from 'react'
import { getAuthed, invalidateAuthedCache } from '@/lib/client/authed-api'
import type { AppNotification } from '@/lib/notification'

export default function useProfileInvitations(uid?: string, refresh?: boolean) {
  const [items, setItems] = useState<AppNotification[]>([])
  useEffect(() => {
    setItems([])
    if (!uid) return
    let active = true
    const path = '/api/athlete-profile-invitations'
    if (refresh !== false) invalidateAuthedCache(path)
    getAuthed(path)
      .then((response) => response.json())
      .then((payload: { notifications?: AppNotification[] }) => {
        if (active) setItems(payload.notifications || [])
      })
      .catch(() => {
        if (active) setItems([])
      })
    return () => {
      active = false
    }
  }, [uid, refresh])
  return items
}
