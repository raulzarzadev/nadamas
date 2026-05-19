'use client'

import { SearchField } from '@comps/Inputs/FormFields'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { FiCheckCircle, FiExternalLink, FiEye, FiUser } from 'react-icons/fi'
import type { CoachPublic } from '@/firebase/coaches/coach.model'
import { CoachCRUD } from '@/firebase/coaches/main'
import { UserCRUD } from '@/firebase/users/main'
import type { AppUser } from '@/firebase/users/user.model'
import { patchAuthed } from '@/lib/client/authed-api'
import { normalizeRoles } from '@/lib/roles'

export default function UserList() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [coaches, setCoaches] = useState<Record<string, CoachPublic | null>>({})
  const [busyId, setBusyId] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => UserCRUD.listenAll(setUsers), [])

  useEffect(() => {
    const coachUsers = users.filter((user) => normalizeRoles(user).coach)
    const unsubs = coachUsers.map((user) =>
      CoachCRUD.listenPublic(user.id, (coach) =>
        setCoaches((current) => ({ ...current, [user.id]: coach }))
      )
    )

    return () => {
      for (const unsub of unsubs) unsub()
    }
  }, [users])

  async function toggleCoachState(
    user: AppUser,
    key: 'publicProfileVisible' | 'coachVerified',
    next: boolean
  ) {
    setBusyId(user.id)
    await patchAuthed(`/api/admin/users/${user.id}`, { [key]: next })
    setBusyId(null)
  }

  const normalizedQuery = query.trim().toLowerCase()
  const visibleUsers = normalizedQuery
    ? users.filter((user) =>
        [user.displayName, user.name, user.email, user.id]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(normalizedQuery))
      )
    : users

  return (
    <div className="flex flex-col gap-4">
      <SearchField
        label="Buscar usuarios"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar por nombre o correo"
        className="h-12"
      />

      <div className="overflow-hidden rounded-[var(--r-md)] border border-[var(--c-border)] bg-white shadow-[var(--shadow-sm)]">
        {visibleUsers.length === 0 ? (
          <p className="p-8 text-center text-[var(--c-text-2)]">Sin usuarios</p>
        ) : (
          <ul className="divide-y divide-[var(--c-border)]">
            {visibleUsers.map((user) => {
              const roles = normalizeRoles(user)
              const coach = coaches[user.id]
              const visible = coach?.publicProfileVisible === true
              const verified = coach?.verification?.status === 'verified'

              return (
                <li
                  key={user.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--c-surface)] text-[var(--c-ocean-mid)]">
                      <FiUser aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-bold">
                        {user.displayName || user.name || 'Usuario sin nombre'}
                      </p>
                      <p className="truncate text-sm text-[var(--c-text-2)]">
                        {user.email || user.id}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="btn btn-sm gap-2 border-[var(--c-border)] bg-white text-[var(--c-text-2)]"
                    >
                      Ver perfil <FiExternalLink aria-hidden="true" />
                    </Link>
                    {roles.coach && (
                      <>
                        <RoleButton
                          active={visible}
                          disabled={busyId === user.id}
                          onClick={() => toggleCoachState(user, 'publicProfileVisible', !visible)}
                        >
                          <FiEye aria-hidden="true" />
                          Visible
                        </RoleButton>
                        <RoleButton
                          active={verified}
                          disabled={busyId === user.id}
                          onClick={() => toggleCoachState(user, 'coachVerified', !verified)}
                        >
                          <FiCheckCircle aria-hidden="true" />
                          Verificado
                        </RoleButton>
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

function RoleButton({
  active,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={`btn btn-sm gap-2 ${
        active ? 'btn-primary' : 'border-[var(--c-border)] bg-white text-[var(--c-text-2)]'
      }`}
    >
      {children}
    </button>
  )
}
