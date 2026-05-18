'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FiExternalLink, FiShield, FiUser } from 'react-icons/fi'
import { UserCRUD } from '@/firebase/users/main'
import type { AppUser } from '@/firebase/users/user.model'
import { normalizeRoles, type Roles } from '@/lib/roles'

export default function UserList() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => UserCRUD.listenAll(setUsers), [])

  async function toggleRole(user: AppUser, role: 'coach' | 'admin') {
    const current = normalizeRoles(user)
    const next: Roles = { ...current, [role]: !current[role] }
    setBusyId(user.id)
    await UserCRUD.updateRoles(user.id, next)
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
      <label className="block">
        <span className="sr-only">Buscar usuarios</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre o correo"
          className="h-12 w-full rounded-2xl border border-[var(--c-border)] bg-white px-4 shadow-[var(--shadow-sm)] outline-none transition focus:border-[var(--c-aqua)]"
        />
      </label>

      <div className="overflow-hidden rounded-[var(--r-md)] border border-[var(--c-border)] bg-white shadow-[var(--shadow-sm)]">
      {visibleUsers.length === 0 ? (
        <p className="p-8 text-center text-[var(--c-text-2)]">Sin usuarios</p>
      ) : (
        <ul className="divide-y divide-[var(--c-border)]">
          {visibleUsers.map((user) => {
            const roles = normalizeRoles(user)

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
                  <RoleButton
                    active={roles.coach}
                    disabled={busyId === user.id}
                    onClick={() => toggleRole(user, 'coach')}
                  >
                    Coach
                  </RoleButton>
                  <RoleButton
                    active={roles.admin}
                    disabled={busyId === user.id}
                    onClick={() => toggleRole(user, 'admin')}
                  >
                    <FiShield aria-hidden="true" />
                    Admin
                  </RoleButton>
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
        active
          ? 'btn-primary'
          : 'border-[var(--c-border)] bg-white text-[var(--c-text-2)]'
      }`}
    >
      {children}
    </button>
  )
}
