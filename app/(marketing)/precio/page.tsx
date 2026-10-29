import type { Metadata } from 'next'
import Link from 'next/link'
import { FiArrowRight, FiCheck, FiGlobe, FiLayers, FiSmartphone } from 'react-icons/fi'
import { NADAMAS_PRICING } from '@/lib/pricing'

const BASIC_PRICE = `$${NADAMAS_PRICING.regularMonthly} ${NADAMAS_PRICING.currency}`
const BASIC_LIMITS = `${NADAMAS_PRICING.basicLimits.teachers} profes y ${NADAMAS_PRICING.basicLimits.students} alumnos`
const TRIAL = `Prueba de ${NADAMAS_PRICING.trialDays} días sin tarjeta para la primera escuela de cada propietario.`

export const metadata: Metadata = {
  title: 'Precios · Suscripción por escuela',
  description: `Nadamas por ${BASIC_PRICE} al mes por escuela, hasta ${BASIC_LIMITS}. ${TRIAL}`,
  alternates: { canonical: 'https://nadamas.app/precio' },
  openGraph: {
    title: `Nadamas · ${BASIC_PRICE} al mes por escuela`,
    description: `Hasta ${BASIC_LIMITS}. ${TRIAL}`,
    url: 'https://nadamas.app/precio',
    images: [{ url: '/og-nadamas.png', width: 1200, height: 630, alt: 'nadamas.app' }],
  },
}

const FEATURES = [
  'Agenda, horarios y solicitudes de clases',
  'Gestión de alumnos y entrenadores',
  'Pagos, comprobantes, planes y saldos',
  'Asistencia e historial de clases',
  'Seguimiento del progreso de los alumnos',
  'Notificaciones para estar al día',
]

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-[1100px] px-3 pb-14 pt-10 sm:px-8 sm:pb-20 sm:pt-16">
      <header className="mx-auto max-w-2xl text-center">
        <span className="inline-flex rounded-full bg-(--c-surface) px-4 py-2 text-xs font-bold uppercase tracking-wider text-(--c-aqua-strong)">
          Una suscripción por escuela
        </span>
        <h1 className="mt-5 text-4xl font-extrabold sm:text-5xl lg:text-6xl">
          Más tiempo para nadar.
          <span className="mt-2 block text-(--c-aqua-strong)">Menos para administrar.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-(--c-text-2) sm:text-lg">
          Clases, alumnos, pagos y progreso en un solo lugar. Una mensualidad con todas las
          funcionalidades de Nadamas para tu escuela.
        </p>
      </header>

      <div className="mt-10 grid gap-6 md:grid-cols-2 sm:mt-12">
        <section
          aria-labelledby="launch-plan"
          className="flex min-w-0 flex-col bg-white p-4 sm:rounded-[28px] sm:border sm:border-(--c-border) sm:p-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="launch-plan" className="text-2xl font-extrabold">
              Básico
            </h2>
            <span className="rounded-full bg-[#ddf7ef] px-3 py-1.5 text-xs font-bold text-[#08664d]">
              Todas las funcionalidades
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-(--c-text-2)">
            Todo lo que necesitas para organizar tus clases y seguir avanzando.
          </p>

          <div className="mt-7">
            <p className="mt-1 flex flex-wrap items-baseline gap-x-3">
              <span className="text-[5rem] font-extrabold leading-none tracking-tight sm:text-[6rem]">
                ${NADAMAS_PRICING.regularMonthly}
              </span>
              <span className="text-base font-semibold text-(--c-text-2)">MXN / mes</span>
            </p>
            <p className="mt-3 text-sm font-bold">
              Hasta {NADAMAS_PRICING.basicLimits.teachers} profes y{' '}
              {NADAMAS_PRICING.basicLimits.students} alumnos
            </p>
            <p className="mt-1 text-sm font-semibold text-(--c-aqua-strong)">
              Prueba de {NADAMAS_PRICING.trialDays} días sin tarjeta para tu primera escuela.
            </p>
          </div>

          <ul className="my-7 space-y-3">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-3 text-sm leading-relaxed">
                <FiCheck
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-(--c-aqua-strong)"
                />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/login"
            className="mt-auto inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-(--c-aqua-strong) px-5 py-3 font-bold text-white transition-colors hover:bg-(--c-ocean) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-(--c-aqua-strong)"
          >
            Crear mi escuela
            <FiArrowRight aria-hidden="true" />
          </Link>
        </section>

        <section
          aria-labelledby="custom-plan"
          className="relative flex min-w-0 flex-col overflow-hidden bg-(--c-ocean) p-5 text-white sm:rounded-[28px] sm:p-8"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full border-[40px] border-[#90e0ef]/10"
          />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <h2 id="custom-plan" className="text-2xl font-extrabold" style={{ color: 'white' }}>
              Personalizado
            </h2>
            <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-[#90e0ef]">
              Hecho para tu escuela
            </span>
          </div>
          <p className="relative mt-3 text-sm leading-relaxed text-[#d0e7ef]">
            Para escuelas más grandes o con necesidades propias.
          </p>
          <div className="relative mt-7">
            <p className="text-3xl font-extrabold sm:text-4xl">Precio a la medida</p>
            <p className="mt-3 text-sm font-bold">
              Más de {NADAMAS_PRICING.basicLimits.teachers} profes o{' '}
              {NADAMAS_PRICING.basicLimits.students} alumnos
            </p>
          </div>

          <ul className="relative my-8 space-y-6">
            {[
              {
                icon: FiLayers,
                title: 'Tu propia escuela',
                detail: 'Un espacio con tu identidad.',
              },
              {
                icon: FiSmartphone,
                title: 'Tu propia app',
                detail: 'Una experiencia para tu comunidad.',
              },
              {
                icon: FiGlobe,
                title: 'Enlace personalizado',
                detail: 'Comparte tu escuela con tus alumnos.',
              },
            ].map(({ icon: Icon, title, detail }) => (
              <li key={title} className="flex items-start gap-4">
                <Icon aria-hidden="true" className="mt-1 size-5 shrink-0 text-[#90e0ef]" />
                <div>
                  <p className="font-bold">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[#d0e7ef]">{detail}</p>
                </div>
              </li>
            ))}
          </ul>
          <Link
            href="/contacto"
            className="relative mt-auto inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-5 py-3 font-bold text-(--c-ocean) transition-colors hover:bg-[#d0f3fa] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-white"
          >
            Contáctanos
            <FiArrowRight aria-hidden="true" />
          </Link>
        </section>
      </div>

      <p className="mx-auto mt-7 max-w-xl text-center text-sm leading-relaxed text-(--c-text-2)">
        Estos precios corresponden al uso de Nadamas. Las clases y cuotas de cada escuela se pagan
        por separado.
      </p>
    </div>
  )
}
