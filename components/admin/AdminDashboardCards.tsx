'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { CoachCRUD } from '@/firebase/coaches/main'
import { UserCRUD } from '@/firebase/users/main'

export default function AdminDashboardCards() {
  const [pendingReviews, setPendingReviews] = useState(0)
  const [users, setUsers] = useState(0)

  useEffect(
    () =>
      CoachCRUD.listenPendingIdentityReviews((items) =>
        setPendingReviews(items.length)
      ),
    []
  )
  useEffect(() => UserCRUD.listenAll((items) => setUsers(items.length)), [])

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <AdminCard
        href="/admin/verify-queue"
        title="Verificaciones"
        body="Coaches pendientes de validación de identidad."
        stat={pendingReviews}
        statLabel="pendientes"
      />
      <AdminCard
        href="/admin/users"
        title="Usuarios"
        body="Listado de usuarios y sus roles."
        stat={users}
        statLabel="registrados"
      />
    </div>
  )
}

function AdminCard({
  href,
  title,
  body,
  stat,
  statLabel,
}: {
  href: string
  title: string
  body: string
  stat: number
  statLabel: string
}) {
  return (
    <Link
      href={href}
      className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-6 shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)]"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-bold text-[var(--c-ocean-mid)]">
          {title}
        </h2>
        <span className="rounded-full bg-[var(--c-surface)] px-3 py-1 text-sm font-bold text-[var(--c-ocean)]">
          {stat}
        </span>
      </div>
      <p className="mt-2 text-sm text-[var(--c-text-2)]">{body}</p>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--c-ocean-mid)]">
        {statLabel}
      </p>
    </Link>
  )
}
