'use client'

import { SearchField } from '@comps/Inputs/FormFields'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { FiArrowRight, FiRefreshCw } from 'react-icons/fi'
import { ADMIN_ROLE_LABELS, type AdminOverview, type AdminPersonRole } from '@/lib/admin-overview'
import { getAuthed, getCachedAuthedData, invalidateAuthedCache } from '@/lib/client/authed-api'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'
import AdminOverviewLists, { type AdminOverviewTab } from './AdminOverviewLists'

const OVERVIEW_URL = '/api/admin/overview'
const TABS: { id: AdminOverviewTab; label: string }[] = [
  { id: 'schools', label: 'Escuelas' },
  { id: 'people', label: 'Personas' },
  { id: 'profiles', label: 'Perfiles adicionales' },
  { id: 'payments', label: 'Planes y pagos' },
  { id: 'subscription', label: 'Suscripción Nadamas' },
]

export default function AdminOverviewDashboard() {
  const [data, setData] = useState<AdminOverview | null>(
    () => getCachedAuthedData(OVERVIEW_URL) || null
  )
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState(false)
  const [reload, setReload] = useState(0)
  const [tab, setTab] = useState<AdminOverviewTab>('schools')
  const [role, setRole] = useState<AdminPersonRole | 'all'>('all')
  const [query, setQuery] = useState('')

  // biome-ignore lint/correctness/useExhaustiveDependencies: the refresh counter intentionally reruns this load.
  useEffect(() => {
    let active = true
    setBusy(true)
    setError(false)
    getAuthed(OVERVIEW_URL)
      .then((response) => response.json())
      .then((payload: AdminOverview) => {
        if (active) setData(payload)
      })
      .catch((error) => {
        if (!active) return
        reportInternalError('ADMIN_OVERVIEW', error)
        setError(true)
      })
      .finally(() => {
        if (active) setBusy(false)
      })
    return () => {
      active = false
    }
  }, [reload])

  function refresh() {
    invalidateAuthedCache(OVERVIEW_URL)
    setReload((value) => value + 1)
  }
  function openTab(next: AdminOverviewTab, nextRole: AdminPersonRole | 'all' = 'all') {
    setTab(next)
    setRole(nextRole)
    setQuery('')
  }

  return (
    <div className="flex min-w-0 flex-col gap-6" aria-busy={busy}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-(--c-text-2)">
            Escuelas, personas y pagos de toda la plataforma.
          </p>
          {data && (
            <p className="mt-1 text-xs text-(--c-text-2)">
              Actualizado a las{' '}
              {new Date(data.updatedAt).toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={busy}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-(--c-ocean) disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong)"
        >
          <FiRefreshCw
            aria-hidden="true"
            className={busy ? 'animate-spin motion-reduce:animate-none' : ''}
          />
          Actualizar
        </button>
      </div>
      {error && (
        <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">
          {GENERIC_USER_ERROR} {data ? 'Se conservan los últimos datos cargados.' : ''}
          <button
            type="button"
            onClick={refresh}
            disabled={busy}
            className="ml-1 min-h-11 font-bold underline"
          >
            Reintentar
          </button>
        </div>
      )}
      {!data ? (
        busy && (
          <div
            role="status"
            aria-label="Cargando panel de administración"
            className="grid grid-cols-2 gap-3 lg:grid-cols-4"
          >
            {[
              'schools',
              'coordinators',
              'coaches',
              'athletes',
              'users',
              'profiles',
              'products',
              'payments',
            ].map((name) => (
              <div
                key={name}
                className="h-28 animate-pulse bg-white sm:rounded-2xl motion-reduce:animate-none"
              />
            ))}
          </div>
        )
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              {
                label: 'Escuelas',
                count: data.counts.schools,
                target: 'schools' as const,
                role: 'all' as const,
                detail: 'registradas',
              },
              {
                label: 'Coordinadores',
                count: data.counts.coordinators,
                target: 'people' as const,
                role: 'coordinator' as const,
                detail: 'en escuelas',
              },
              {
                label: 'Entrenadores',
                count: data.counts.coaches,
                target: 'people' as const,
                role: 'coach' as const,
                detail: 'cuentas y profesores',
              },
              {
                label: 'Atletas',
                count: data.counts.athletes,
                target: 'people' as const,
                role: 'athlete' as const,
                detail: 'cuentas con acceso de atleta',
              },
              {
                label: 'Usuarios',
                count: data.counts.users,
                target: 'people' as const,
                role: 'all' as const,
                detail: 'cuentas registradas',
              },
              {
                label: 'Perfiles adicionales',
                count: data.counts.additionalProfiles,
                target: 'profiles' as const,
                role: 'all' as const,
                detail: 'gestionados desde una cuenta',
              },
              {
                label: 'Planes activos',
                count: data.counts.activeProducts,
                target: 'payments' as const,
                role: 'all' as const,
                detail: `de ${data.counts.products} planes y paquetes`,
              },
              {
                label: 'Pagos pendientes',
                count: data.counts.pendingPayments,
                target: 'payments' as const,
                role: 'all' as const,
                detail: 'por confirmar en escuelas/coaches',
              },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => openTab(item.target, item.role)}
                className="min-w-0 bg-white p-4 text-left transition-colors hover:bg-(--c-surface) sm:rounded-2xl sm:border sm:border-(--c-border) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong)"
              >
                <span className="block text-xs font-semibold text-(--c-text-2)">{item.label}</span>
                <span className="mt-2 block text-3xl font-extrabold tabular-nums text-(--c-ocean)">
                  {item.count.toLocaleString('es-MX')}
                </span>
                <span className="mt-2 block text-[11px] leading-relaxed text-(--c-text-2)">
                  {item.detail}
                </span>
              </button>
            ))}
          </div>
          <p className="-mt-3 text-xs leading-relaxed text-(--c-text-2)">
            Una cuenta puede tener varios roles. Todas las cuentas tienen acceso de atleta; los
            perfiles adicionales se cuentan por separado.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Shortcut
              href="/admin/verify-queue"
              title="Verificaciones"
              value={data.counts.pendingReviews}
              detail="pendientes de identidad"
            />
            <Shortcut
              href="/admin/bookings"
              title="Reservas personales"
              value={data.counts.privateBookings}
              detail="confirmadas y canceladas"
            />
            <div className="bg-(--c-surface) p-4 sm:rounded-2xl">
              <p className="text-sm font-bold">Clases de escuelas</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums">
                {data.counts.schoolClasses}
              </p>
              <p className="mt-1 text-xs text-(--c-text-2)">
                {data.counts.pendingClassRequests} solicitudes pendientes
              </p>
            </div>
          </div>
          <section aria-label="Explorar la plataforma" className="min-w-0">
            <fieldset className="flex min-w-0 flex-wrap gap-2" aria-label="Secciones del panel">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={tab === item.id}
                  onClick={() => openTab(item.id)}
                  className={`min-h-11 rounded-full px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong) ${tab === item.id ? 'bg-(--c-ocean) text-white' : 'bg-white text-(--c-ocean) hover:bg-(--c-surface)'}`}
                >
                  {item.label}
                </button>
              ))}
            </fieldset>
            {tab !== 'subscription' && (
              <div className="mt-5">
                <SearchField
                  label={`Buscar ${TABS.find((item) => item.id === tab)?.label.toLowerCase()}`}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onClear={() => setQuery('')}
                  placeholder={
                    tab === 'people'
                      ? 'Nombre, correo o escuela'
                      : tab === 'profiles'
                        ? 'Nombre o cuenta responsable'
                        : 'Nombre o escuela'
                  }
                />
              </div>
            )}
            {tab === 'people' && (
              <fieldset
                className="mt-3 flex min-w-0 flex-wrap gap-2"
                aria-label="Filtrar personas por rol"
              >
                {(['all', 'coordinator', 'coach', 'athlete', 'admin'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={role === value}
                    onClick={() => setRole(value)}
                    className={`min-h-11 rounded-full px-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong) ${role === value ? 'bg-(--c-aqua-strong) text-white' : 'bg-white text-(--c-ocean)'}`}
                  >
                    {value === 'all' ? 'Todos' : ADMIN_ROLE_LABELS[value]}
                  </button>
                ))}
              </fieldset>
            )}
            <AdminOverviewLists
              key={`${tab}:${role}:${query}`}
              data={data}
              tab={tab}
              query={query}
              role={role}
            />
          </section>
        </>
      )}
    </div>
  )
}

function Shortcut({
  href,
  title,
  value,
  detail,
}: {
  href: string
  title: string
  value: number
  detail: string
}) {
  return (
    <Link
      href={href}
      className="bg-white p-4 sm:rounded-2xl sm:border sm:border-(--c-border) hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong)"
    >
      <span className="flex items-center justify-between gap-2 text-sm font-bold">
        {title}
        <FiArrowRight aria-hidden="true" />
      </span>
      <span className="mt-1 block text-2xl font-extrabold tabular-nums">{value}</span>
      <span className="mt-1 block text-xs text-(--c-text-2)">{detail}</span>
    </Link>
  )
}
