'use client'
import { useEffect, useRef, useState } from 'react'
import { useRole } from '@/context/RoleContext'
import { ROLE_LABEL } from './nav-config'

export default function RoleSwitcher({
  currentRole,
}: {
  currentRole?: 'athlete' | 'coach' | 'admin'
}) {
  const { roles, activeRole, setActiveRole, enableCoach } = useRole()
  const displayedRole = currentRole ?? activeRole
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)

  const handleEnableCoach = async () => {
    setBusy(true)
    try {
      await enableCoach()
      setActiveRole('coach')
    } finally {
      setBusy(false)
      setOpen(false)
    }
  }

  const getItems = () =>
    menuRef.current
      ? Array.from(
          menuRef.current.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])')
        )
      : []

  const closeAndFocusTrigger = () => {
    setOpen(false)
    triggerRef.current?.focus()
  }

  const handleMenuKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      closeAndFocusTrigger()
      return
    }
    const items = getItems()
    if (items.length === 0) return
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement)
    let nextIndex: number | null = null
    if (e.key === 'ArrowDown') {
      nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length
    } else if (e.key === 'ArrowUp') {
      nextIndex =
        currentIndex < 0 ? items.length - 1 : (currentIndex - 1 + items.length) % items.length
    } else if (e.key === 'Home') {
      nextIndex = 0
    } else if (e.key === 'End') {
      nextIndex = items.length - 1
    }
    if (nextIndex !== null) {
      e.preventDefault()
      items[nextIndex]?.focus()
    }
  }

  useEffect(() => {
    if (!open) return
    const items = menuRef.current
      ? Array.from(
          menuRef.current.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])')
        )
      : []
    items[0]?.focus()
  }, [open])

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2 text-sm font-semibold text-[var(--c-ocean-mid)] transition-opacity hover:opacity-80 cursor-pointer"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {/* <span className="hidden xl:inline">Actuando como: </span> */}
        {ROLE_LABEL[displayedRole]} <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <ul
            ref={menuRef}
            role="menu"
            onKeyDown={handleMenuKeyDown}
            className="absolute right-0 z-20 mt-2 w-60 rounded-[var(--r-md)] bg-white shadow-[var(--shadow-md)] border border-[var(--c-border)] p-2"
          >
            <li role="none">
              <button
                role="menuitem"
                onClick={() => {
                  setActiveRole('athlete')
                  setOpen(false)
                }}
                className="w-full text-left px-3 py-2 rounded-[var(--r-sm)] text-sm hover:bg-[var(--c-surface)] cursor-pointer"
              >
                Modo {ROLE_LABEL.athlete}
              </button>
            </li>
            <li role="none">
              {roles.coach ? (
                <button
                  role="menuitem"
                  onClick={() => {
                    setActiveRole('coach')
                    setOpen(false)
                  }}
                  className="w-full text-left px-3 py-2 rounded-[var(--r-sm)] text-sm hover:bg-[var(--c-surface)] cursor-pointer"
                >
                  Modo {ROLE_LABEL.coach}
                </button>
              ) : (
                <button
                  role="menuitem"
                  disabled={busy}
                  onClick={handleEnableCoach}
                  className="w-full text-left px-3 py-2 rounded-[var(--r-sm)] text-sm text-[var(--c-aqua-strong)] font-semibold hover:bg-[var(--c-surface)] disabled:opacity-50 cursor-pointer"
                >
                  {busy ? 'Activando…' : 'Activar modo entrenador'}
                </button>
              )}
            </li>
          </ul>
        </>
      )}
    </div>
  )
}
