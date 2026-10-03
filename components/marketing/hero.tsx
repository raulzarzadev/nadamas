import Image from 'next/image'
import Link from 'next/link'
import { FiArrowRight, FiSearch } from 'react-icons/fi'

export default function Hero() {
  return (
    <section id="inicio" className="relative isolate overflow-hidden bg-[#0a2540]">
      <Image
        src="/images/landing-swimmer.webp"
        alt="Atleta entrenando estilo libre en una alberca"
        fill
        priority
        sizes="100vw"
        className="object-cover object-[62%_center] sm:object-[center_48%]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,24,42,0.90)_0%,rgba(5,24,42,0.68)_46%,rgba(5,24,42,0.18)_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(0deg,rgba(5,24,42,0.55),transparent_55%)]"
      />

      <div className="relative mx-auto flex min-h-[min(72svh,680px)] max-w-[1180px] items-end px-5 pb-12 pt-16 sm:px-8 sm:pb-16 lg:min-h-[650px]">
        <div className="min-w-0 w-full max-w-[42rem]">
          <p className="text-sm font-bold uppercase" style={{ color: '#9ceaf0' }}>
            Tu espacio para nadar y enseñar
          </p>
          <h1
            className="mt-3 text-[2.5rem] font-extrabold min-[360px]:text-5xl sm:text-6xl lg:text-7xl"
            style={{ color: '#fff' }}
          >
            nadamas.app
          </h1>
          <p
            className="mt-5 max-w-xl text-xl font-semibold leading-snug sm:text-2xl"
            style={{ color: '#fff' }}
          >
            Clases, agendas y progreso de natación en un solo lugar.
          </p>
          <p
            className="mt-4 max-w-lg text-base leading-relaxed sm:text-lg"
            style={{ color: 'rgba(255,255,255,0.88)' }}
          >
            Atletas encuentran horarios. Entrenadores organizan sus clases. Directores coordinan
            escuelas y equipos.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/coaches"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-(--c-ocean) transition-colors hover:bg-(--c-surface) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <FiSearch aria-hidden="true" />
              Explorar entrenadores
              <FiArrowRight aria-hidden="true" />
            </Link>
            <a
              href="#como-funciona"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/70 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Cómo funciona
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
