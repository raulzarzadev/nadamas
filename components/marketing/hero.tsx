import Image from 'next/image'
import { NADAMAS_PRICING } from '@/lib/pricing'
import HeroVideo from './hero-video'
import HomeModeLinks from './home-mode-links'

export default function Hero() {
  return (
    <section id="inicio" className="relative isolate overflow-hidden bg-[#0a2540]">
      <Image
        src="/images/landing/hero-poster.webp"
        alt="Alberca al atardecer con palmeras y nadadores entrenando"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <HeroVideo />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,24,42,0.92)_0%,rgba(5,24,42,0.72)_48%,rgba(5,24,42,0.2)_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(0deg,rgba(5,24,42,0.6),transparent_55%)]"
      />

      <div className="relative mx-auto flex min-h-[min(calc(100svh-72px),720px)] max-w-[1180px] items-end px-4 pb-10 pt-10 sm:px-8 sm:pt-12 sm:pb-12">
        <div className="w-full min-w-0 max-w-[56rem]">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-[#9ceaf0] backdrop-blur-sm">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-[#9ceaf0]" />$
            {NADAMAS_PRICING.regularMonthly} {NADAMAS_PRICING.currency} al mes por escuela
          </p>
          <h1
            className="mt-5 text-[2.2rem] font-extrabold min-[380px]:text-[2.5rem] sm:text-5xl lg:text-[3.3rem]"
            style={{ color: '#fff' }}
          >
            La app para nadadores, entrenadores y escuelas de natación.
          </h1>
          <p
            className="mt-5 max-w-xl text-lg leading-relaxed sm:text-xl"
            style={{ color: 'rgba(255,255,255,0.9)' }}
          >
            Agenda, reservas, pagos y progreso de natación en un solo lugar.
          </p>
          <HomeModeLinks />
        </div>
      </div>
    </section>
  )
}
