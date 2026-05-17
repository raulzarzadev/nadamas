'use client'

import { useEffect, useState } from 'react'
import { FiShield, FiUser } from 'react-icons/fi'
import { UserCRUD } from '@/firebase/users/main'
import type { AppUser } from '@/firebase/users/user.model'
import { normalizeRoles, type Roles } from '@/lib/roles'

export default function UserList() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => UserCRUD.listenAll(setUsers), [])

  async function toggleRole(user: AppUser, role: 'coach' | 'admin') {
    const current = normalizeRoles(user)
    const next: Roles = { ...current, [role]: !current[role] }
    setBusyId(user.id)
    await UserCRUD.updateRoles(user.id, next)
    setBusyId(null)
  }

  return (
    <div className="overflow-hidden rounded-[var(--r-md)] border border-[var(--c-border)] bg-white shadow-[var(--shadow-sm)]">
      {users.length === 0 ? (
        <p className="p-8 text-center text-[var(--c-text-2)]">Sin usuarios</p>
      ) : (
        <ul className="divide-y divide-[var(--c-border)]">
          {users.map((user) => {
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
