import Link from 'next/link'
import { FiArrowRight } from 'react-icons/fi'

export default function FinalCta() {
  return (
    <section className="bg-[#faebe6] px-5 py-16 sm:px-8 sm:py-20">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase text-[#a94732]">Empieza aquí</p>
          <h2 className="mt-3 max-w-[17ch] text-3xl font-extrabold sm:text-4xl">
            Hay un lugar para ti dentro y fuera del agua.
          </h2>
          <p className="mt-4 max-w-[48ch] text-base leading-relaxed text-(--c-text-2) sm:text-lg">
            Reserva una clase, organiza tu agenda o coordina toda tu escuela.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-(--c-ocean) px-7 py-3 font-bold text-white transition-colors hover:bg-[#164263] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-ocean)"
          >
            Ingresar
            <FiArrowRight aria-hidden="true" />
          </Link>
          <Link
            href="/coaches"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-(--c-ocean) px-7 py-3 font-semibold text-(--c-ocean) transition-colors hover:bg-white/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-ocean)"
          >
            Explorar entrenadores
          </Link>
        </div>
      </div>
    </section>
  )
}
