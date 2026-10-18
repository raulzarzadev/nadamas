import Link from 'next/link'
import { FiArrowRight, FiCheck } from 'react-icons/fi'
import { NADAMAS_PRICING } from '@/lib/pricing'

const INCLUDED = [
  'Agenda, reservas y solicitudes',
  'Alumnos, entrenadores y perfiles familiares',
  'Pagos, comprobantes, planes y saldos',
  'Asistencia, entrenos y progreso',
] as const

export default function PricingTeaser() {
  return (
    <section
      id="precio"
      aria-labelledby="precio-title"
      className="scroll-mt-20 px-5 py-20 sm:px-8 lg:py-24"
    >
      <div className="relative mx-auto grid max-w-[1180px] gap-10 overflow-hidden rounded-[var(--r-lg)] bg-(--c-ocean) px-6 py-10 text-white sm:px-12 sm:py-14 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full opacity-40 blur-3xl"
          style={{ background: 'var(--grad-brand)' }}
        />
        <div className="relative">
          <p className="text-sm font-bold uppercase text-[#9ceaf0]">Precio de lanzamiento</p>
          <h2
            id="precio-title"
            className="mt-3 text-3xl font-extrabold sm:text-4xl"
            style={{ color: '#fff' }}
          >
            Todas las funciones, un solo precio.
          </h2>
          <p className="mt-6 text-base text-[#d0e7ef]">
            Antes{' '}
            <s>
              ${NADAMAS_PRICING.regularMonthly} {NADAMAS_PRICING.currency}
            </s>
          </p>
          <p className="mt-1 flex items-baseline gap-3">
            <span className="text-6xl font-extrabold tracking-tight sm:text-7xl">
              ${NADAMAS_PRICING.launchMonthly}
            </span>
            <span className="font-semibold text-[#d0e7ef]">{NADAMAS_PRICING.currency} / mes</span>
          </p>
        </div>
        <div className="relative">
          <ul className="space-y-3">
            {INCLUDED.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <FiCheck aria-hidden="true" className="mt-1 shrink-0 text-[#9ceaf0]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-(--c-ocean) transition-colors hover:bg-(--c-surface) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Empezar ahora
              <FiArrowRight aria-hidden="true" />
            </Link>
            <Link
              href="/precio"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/60 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Ver precios y escuelas
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
