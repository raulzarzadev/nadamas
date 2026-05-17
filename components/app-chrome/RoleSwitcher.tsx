'use client'
import { useState } from 'react'
import { useRole } from '@/context/RoleContext'
import { ROLE_LABEL } from './nav-config'

export default function RoleSwitcher() {
  const { roles, activeRole, setActiveRole, enableCoach } = useRole()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

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

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full px-4 py-2 text-sm font-semibold bg-[var(--c-surface)] text-[var(--c-ocean-mid)] border border-[var(--c-border)] hover:opacity-80 transition-opacity cursor-pointer"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Actuando como: {ROLE_LABEL[activeRole]} ▾
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <ul
            role="menu"
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
                {ROLE_LABEL.athlete}
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
                  {ROLE_LABEL.coach}
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
