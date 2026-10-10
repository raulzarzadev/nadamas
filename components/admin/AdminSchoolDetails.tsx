'use client'

import Link from 'next/link'
import type { AdminPaymentProduct, AdminSchool } from '@/lib/admin-overview'

const money = (cents: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cents / 100)

export default function AdminSchoolDetails({
  school,
  products,
}: {
  school: AdminSchool
  products: AdminPaymentProduct[]
}) {
  return (
    <details className="mt-3 w-full min-w-0 rounded-xl bg-(--c-surface) p-3">
      <summary className="min-h-11 cursor-pointer content-center font-bold text-sm text-(--c-aqua-strong) focus-visible:outline-2 focus-visible:outline-offset-4">
        Ver detalles de {school.name}
      </summary>
      <div className="mt-3 grid min-w-0 gap-5 lg:grid-cols-3">
        <section aria-label={`Entrenadores de ${school.name}`}>
          <h3 className="text-sm font-bold">Entrenadores ({school.teachers.length})</h3>
          {school.teachers.length ? (
            <ul className="mt-2 space-y-1">
              {school.teachers.map((person) => (
                <li key={person.id}>
                  <Link
                    className="inline-flex min-h-11 items-center break-words text-sm underline focus-visible:outline-2"
                    href={`/admin/users/${person.id}`}
                  >
                    {person.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No hay entrenadores activos asignados.</Empty>
          )}
        </section>
        <section aria-label={`Planes de ${school.name}`}>
          <h3 className="text-sm font-bold">Planes ({products.length})</h3>
          {products.length ? (
            <ul className="mt-2 space-y-3">
              {products.map((product) => (
                <li key={product.id} className="min-w-0 text-sm">
                  <p className="break-words font-semibold">{product.name}</p>
                  <p>
                    {money(product.priceCents)} MXN · {product.active ? 'Activo' : 'Inactivo'}
                  </p>
                  <p className="mt-1 text-xs text-(--c-text-2)">
                    {product.mode === 'classes'
                      ? `${product.classes} clases · ${product.expiryDays ? `${product.expiryDays} días de vigencia` : 'Sin caducidad'}`
                      : `${product.months} meses desde la activación`}
                    {product.perDay ? ` · ${product.perDay} al día` : ''}
                    {product.perWeek ? ` · ${product.perWeek} a la semana` : ''}
                    {product.perPeriod ? ` · ${product.perPeriod} por periodo` : ''}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No hay planes creados.</Empty>
          )}
        </section>
        <section aria-label={`Alumnos de ${school.name}`}>
          <h3 className="text-sm font-bold">Alumnos activos ({school.roster.length})</h3>
          {school.roster.length ? (
            <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto">
              {school.roster.map((student) => (
                <li key={student.id} className="break-words text-sm">
                  {student.userId ? (
                    <Link
                      className="inline-flex min-h-11 items-center underline focus-visible:outline-2"
                      href={`/admin/users/${student.userId}`}
                    >
                      {student.name}
                    </Link>
                  ) : (
                    <span className="inline-flex min-h-11 items-center">{student.name}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No hay alumnos activos inscritos.</Empty>
          )}
        </section>
      </div>
    </details>
  )
}
function Empty({ children }: { children: string }) {
  return <p className="mt-2 text-xs text-(--c-text-2)">{children}</p>
}
