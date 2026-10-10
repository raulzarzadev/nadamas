'use client'

import Link from 'next/link'
import { type ReactNode, useState } from 'react'
import {
  ADMIN_ROLE_LABELS,
  type AdminOverview,
  type AdminPaymentProduct,
  type AdminPersonRole,
} from '@/lib/admin-overview'
import { NADAMAS_PRICING } from '@/lib/pricing'
import AdminSchoolDetails from './AdminSchoolDetails'

export type AdminOverviewTab = 'schools' | 'people' | 'profiles' | 'payments' | 'subscription'
const PAGE_SIZE = 20
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-MX')
const money = (cents: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cents / 100)

export default function AdminOverviewLists({
  data,
  tab,
  query,
  role,
}: {
  data: AdminOverview
  tab: AdminOverviewTab
  query: string
  role: AdminPersonRole | 'all'
}) {
  const [page, setPage] = useState(0)
  const needle = normalize(query.trim())
  const matches = (...values: string[]) =>
    !needle || values.some((value) => normalize(value).includes(needle))
  const schools = data.schools.filter((school) =>
    matches(school.name, school.slug, ...school.coordinators.map((person) => person.name))
  )
  const people = data.people.filter(
    (person) =>
      (role === 'all' || person.roles.includes(role)) &&
      matches(person.name, person.email, ...person.schools.map((school) => school.name))
  )
  const profiles = data.profiles.filter((profile) => matches(profile.name, profile.ownerName))
  const products = data.products.filter((product) => matches(product.name, product.scopeName))
  const total =
    tab === 'schools'
      ? schools.length
      : tab === 'people'
        ? people.length
        : tab === 'profiles'
          ? profiles.length
          : products.length
  const currentPage = Math.min(page, Math.max(0, Math.ceil(total / PAGE_SIZE) - 1))
  const slice = <T,>(items: T[]) =>
    items.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

  if (tab === 'subscription')
    return (
      <section
        className="mt-5 bg-white p-4 sm:rounded-2xl sm:border sm:border-(--c-border) sm:p-6"
        aria-labelledby="app-subscription"
      >
        <Badge>Precio de lanzamiento</Badge>
        <h2 id="app-subscription" className="mt-4 text-xl font-bold">
          Suscripción de Nadamas
        </h2>
        <p className="mt-4 text-(--c-text-2)">
          Antes <s>${NADAMAS_PRICING.regularMonthly} MXN / mes</s>
        </p>
        <p className="mt-2">
          <span className="text-5xl font-extrabold">${NADAMAS_PRICING.launchMonthly}</span>
          <span className="ml-2 text-sm text-(--c-text-2)">MXN / mes</span>
        </p>
        <p className="mt-4 text-sm">Incluye todas las funcionalidades.</p>
        <div className="mt-5 rounded-xl bg-(--c-surface) p-4 text-sm leading-relaxed">
          <p className="font-bold">Oferta publicada · Cobro pendiente de integrar</p>
          <p className="mt-2 text-(--c-text-2)">
            Todavía no se registran suscripciones ni cobros de la aplicación. Los pagos de alumnos a
            escuelas y entrenadores se muestran en «Planes y pagos».
          </p>
        </div>
        <Link
          href="/precio"
          className="mt-4 inline-flex min-h-11 items-center font-bold text-(--c-aqua-strong) underline"
        >
          Ver página de precios
        </Link>
      </section>
    )

  return (
    <div className="mt-5">
      {tab === 'payments' && (
        <div className="mb-5">
          <h2 className="text-lg font-bold">Pagos de clases y planes</h2>
          <p className="mt-1 text-sm text-(--c-text-2)">
            De alumnos a escuelas y entrenadores. No son cobros de la suscripción de Nadamas.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>{data.counts.pendingPayments} pendientes</Badge>
            <Badge>{data.counts.approvedPayments} confirmados</Badge>
            <Badge>{data.counts.rejectedPayments} rechazados</Badge>
          </div>
        </div>
      )}
      {tab === 'profiles' && (
        <p className="mb-4 text-sm text-(--c-text-2)">
          {data.counts.coachProfiles} perfiles de entrenador · {data.counts.additionalProfiles}{' '}
          perfiles adicionales. Los perfiles principales se consultan en Personas.
        </p>
      )}
      <p className="mb-3 text-xs font-semibold text-(--c-text-2)">{total} resultados</p>
      {total === 0 ? (
        <div className="bg-white p-6 text-center text-sm text-(--c-text-2) sm:rounded-2xl">
          {query
            ? 'No hay coincidencias con esta búsqueda.'
            : 'Todavía no hay registros en esta sección.'}
        </div>
      ) : (
        <ul className="divide-y divide-(--c-border) bg-white sm:overflow-hidden sm:rounded-2xl sm:border sm:border-(--c-border)">
          {tab === 'schools' &&
            slice(schools).map((school) => (
              <Row key={school.id}>
                <div className="min-w-0 flex-1">
                  <h2 className="break-words font-bold">{school.name}</h2>
                  <p className="mt-1 break-words text-xs text-(--c-text-2)">
                    {school.slug ? `${school.slug}.nadamas.app` : 'Sin enlace personalizado'} ·{' '}
                    {school.isPublic ? 'Pública' : 'Privada'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge>{school.coordinators.length} coordinadores</Badge>
                    <Badge>{school.coaches} entrenadores</Badge>
                    <Badge>{school.students} alumnos activos</Badge>
                    <Badge>{school.products} planes</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-(--c-text-2)">
                    {school.coordinators.length
                      ? school.coordinators.map((person) => (
                          <Link
                            key={person.id}
                            href={`/admin/users/${person.id}`}
                            className="inline-flex min-h-8 items-center font-semibold underline"
                          >
                            {person.name}
                          </Link>
                        ))
                      : 'Sin coordinador activo'}
                  </div>
                  <AdminSchoolDetails
                    school={school}
                    products={data.products.filter(
                      (product) => product.scope === `school:${school.id}`
                    )}
                  />
                </div>
                {school.slug && school.isPublic && (
                  <Link
                    href={`/school/${encodeURIComponent(school.slug)}`}
                    className="inline-flex min-h-11 shrink-0 items-center text-sm font-bold text-(--c-aqua-strong)"
                  >
                    Ver escuela →
                  </Link>
                )}
              </Row>
            ))}
          {tab === 'people' &&
            slice(people).map((person) => (
              <Row key={person.id}>
                <div className="min-w-0 flex-1">
                  <h2 className="break-words font-bold">{person.name}</h2>
                  {person.email && (
                    <p className="mt-1 break-all text-xs text-(--c-text-2)">{person.email}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {person.roles.map((value) => (
                      <Badge key={value}>{ADMIN_ROLE_LABELS[value]}</Badge>
                    ))}
                    {person.disabled && <Badge>Cuenta desactivada</Badge>}
                  </div>
                  {person.schools.length > 0 && (
                    <p className="mt-3 break-words text-xs text-(--c-text-2)">
                      {person.schools.map((school) => school.name).join(' · ')}
                    </p>
                  )}
                </div>
                <Link
                  href={`/admin/users/${person.id}`}
                  className="inline-flex min-h-11 shrink-0 items-center text-sm font-bold text-(--c-aqua-strong)"
                >
                  Ver perfil →
                </Link>
              </Row>
            ))}
          {tab === 'profiles' &&
            slice(profiles).map((profile) => (
              <Row key={profile.id}>
                <div className="min-w-0 flex-1">
                  <h2 className="break-words font-bold">{profile.name}</h2>
                  <p className="mt-1 text-xs text-(--c-text-2)">
                    Gestionado por {profile.ownerName}
                  </p>
                </div>
                {profile.ownerId && (
                  <Link
                    href={`/admin/users/${profile.ownerId}`}
                    className="inline-flex min-h-11 shrink-0 items-center text-sm font-bold text-(--c-aqua-strong)"
                  >
                    Ver cuenta →
                  </Link>
                )}
              </Row>
            ))}
          {tab === 'payments' &&
            slice(products).map((product) => (
              <Row key={product.id}>
                <div className="min-w-0 flex-1">
                  <h2 className="break-words font-bold">{product.name}</h2>
                  <p className="mt-1 text-xs text-(--c-text-2)">
                    {product.scopeKind === 'school'
                      ? 'Escuela'
                      : product.scopeKind === 'coach'
                        ? 'Entrenador independiente'
                        : 'Ámbito'}{' '}
                    · {product.scopeName}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge>
                      {product.mode === 'classes' ? 'Paquete de clases' : 'Plan por periodo'}
                    </Badge>
                    <Badge>{product.active ? 'Activo' : 'Inactivo'}</Badge>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-(--c-text-2)">
                    {productDescription(product)}
                  </p>
                </div>
                <p className="shrink-0 text-lg font-extrabold tabular-nums">
                  {money(product.priceCents)}
                  <span className="ml-1 text-xs font-normal">MXN</span>
                </p>
              </Row>
            ))}
        </ul>
      )}
      {total > PAGE_SIZE && (
        <nav
          aria-label="Paginación del panel"
          className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm"
        >
          <button
            type="button"
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
            className="min-h-11 rounded-full bg-white px-4 disabled:opacity-40"
          >
            Anterior
          </button>
          <span>
            {currentPage + 1} de {Math.ceil(total / PAGE_SIZE)}
          </span>
          <button
            type="button"
            disabled={(currentPage + 1) * PAGE_SIZE >= total}
            onClick={() => setPage(currentPage + 1)}
            className="min-h-11 rounded-full bg-white px-4 disabled:opacity-40"
          >
            Siguiente
          </button>
        </nav>
      )}
    </div>
  )
}

function productDescription(product: AdminPaymentProduct) {
  const duration =
    product.mode === 'classes'
      ? `${product.classes} clases · ${product.expiryDays ? `vigencia de ${product.expiryDays} días` : 'sin caducidad'}`
      : `${product.months} ${product.months === 1 ? 'mes' : 'meses'} desde la activación`
  return [
    duration,
    product.perDay ? `${product.perDay} al día` : '',
    product.perWeek ? `${product.perWeek} a la semana` : '',
    product.perPeriod ? `${product.perPeriod} por periodo` : '',
  ]
    .filter(Boolean)
    .join(' · ')
}
function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-(--c-surface) px-2.5 py-1 text-[11px] font-semibold leading-relaxed text-(--c-ocean)">
      {children}
    </span>
  )
}
function Row({ children }: { children: ReactNode }) {
  return (
    <li className="flex min-w-0 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:p-5">
      {children}
    </li>
  )
}
