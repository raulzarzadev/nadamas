'use client'

import NotificationItem from '@comps/notifications/NotificationItem'
import PushNotificationsControl from '@comps/notifications/PushNotificationsControl'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { FiBell } from 'react-icons/fi'
import { useUser } from '@/context/UserContext'
import { NotificationCRUD } from '@/firebase/notifications/main'
import { getAuthed, postAuthed } from '@/lib/client/authed-api'
import type { AppNotification } from '@/lib/notification'

const PREVIEW_COUNT = 8

interface SchoolInvitationPreview {
  id: string
  schoolName: string
  role: 'teacher' | 'student'
  status: 'pending' | 'expired'
}

const SCHOOL_ROLE_LABEL = {
  teacher: 'Coach',
  student: 'Alumno',
} as const

export default function NotificationsBell() {
  const { user } = useUser() as { user: { uid?: string; id?: string } | null | undefined }
  const uid = user?.uid || user?.id
  const [items, setItems] = useState<AppNotification[]>([])
  const [schoolInvitations, setSchoolInvitations] = useState<SchoolInvitationPreview[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!uid) {
      setItems([])
      return
    }
    const unsubscribe = NotificationCRUD.listenReceived(uid, setItems)
    return () => unsubscribe()
  }, [uid])

  useEffect(() => {
    if (!uid) {
      setSchoolInvitations([])
      return
    }
    let active = true
    getAuthed('/api/school-invitations')
      .then((response) => response.json() as Promise<{ invitations?: SchoolInvitationPreview[] }>)
      .then((payload) => {
        if (active) {
          setSchoolInvitations(
            (payload.invitations || []).filter((invitation) => invitation.status === 'pending')
          )
        }
      })
      .catch(() => {
        if (active) setSchoolInvitations([])
      })
    return () => {
      active = false
    }
  }, [uid])

  useEffect(() => {
    if (!open) return
    const closeOnOutside = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutside)
    return () => document.removeEventListener('pointerdown', closeOnOutside)
  }, [open])

  if (!uid) return null

  const unreadCount = items.reduce((count, item) => count + (item.readAt ? 0 : 1), 0)
  const pendingInvitationCount = schoolInvitations.length

  const toggle = () => {
    setOpen((wasOpen) => {
      const next = !wasOpen
      // Mark everything read when the panel opens.
      if (next && unreadCount > 0) {
        postAuthed('/api/notifications/read', { all: true }).catch(() => {})
      }
      return next
    })
  }

  const preview = items.slice(0, PREVIEW_COUNT)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={
          unreadCount + pendingInvitationCount > 0
            ? `Notificaciones, ${unreadCount + pendingInvitationCount} pendientes`
            : 'Notificaciones'
        }
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[var(--c-border)] bg-white text-[var(--c-ocean)] transition-shadow hover:shadow-[var(--shadow-sm)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)]"
      >
        <FiBell aria-hidden="true" className="h-[18px] w-[18px]" />
        {unreadCount + pendingInvitationCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount + pendingInvitationCount > 9 ? '9+' : unreadCount + pendingInvitationCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed left-3 right-3 top-20 z-50 max-h-[calc(100vh-6rem)] overflow-hidden rounded-[var(--r-md)] border border-[var(--c-border)] bg-white shadow-[var(--shadow-md)] sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-[min(20rem,calc(100vw-1.5rem))]">
          <div className="flex items-center justify-between px-3 py-2.5">
            <p className="text-sm font-bold text-[var(--c-ocean)]">Notificaciones</p>
            <PushNotificationsControl compact />
          </div>
          <div className="max-h-[60vh] overflow-y-auto border-t border-[var(--c-border)]">
            {schoolInvitations.length > 0 && (
              <div className="border-b border-[var(--c-border)]">
                <p className="px-3 pb-1 pt-3 text-xs font-bold uppercase tracking-wide text-[var(--c-text-2)]">
                  Invitaciones escolares
                </p>
                {schoolInvitations.slice(0, 3).map((invitation) => (
                  <Link
                    key={invitation.id}
                    href={`/${invitation.role === 'teacher' ? 'coach' : invitation.role === 'student' ? 'athlete' : 'school'}/invitations/${invitation.id}`}
                    onClick={() => setOpen(false)}
                    className="block px-3 py-3 hover:bg-[var(--c-surface)]"
                  >
                    <p className="text-sm font-bold text-[var(--c-ocean)]">
                      {invitation.schoolName}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--c-text-2)]">
                      Invitación como {SCHOOL_ROLE_LABEL[invitation.role]} ·{' '}
                      <span className="font-bold text-[var(--c-aqua-strong)]">Revisar</span>
                    </p>
                  </Link>
                ))}
              </div>
            )}
            {preview.length === 0 && schoolInvitations.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-[var(--c-text-2)]">
                No tienes notificaciones.
              </p>
            ) : (
              preview.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onNavigate={() => setOpen(false)}
                />
              ))
            )}
          </div>
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-[var(--c-border)] px-3 py-2.5 text-center text-sm font-bold text-[var(--c-aqua-strong)] hover:bg-[var(--c-surface)]"
          >
            Ver todas
          </Link>
        </div>
      )}
    </div>
  )
}
