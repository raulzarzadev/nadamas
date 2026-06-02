import Faq from '@comps/marketing/faq'
import Features from '@comps/marketing/features'
import FinalCta from '@comps/marketing/final-cta'
import ForCoaches from '@comps/marketing/for-coaches'
import Hero from '@comps/marketing/hero'
import HowItWorks from '@comps/marketing/how-it-works'
import MarketplacePreview from '@comps/marketing/marketplace-preview'
import ProductShots from '@comps/marketing/product-shots'
import SocialProof from '@comps/marketing/social-proof'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL('https://nadamas.app'),
  title: 'nadamas.app · Calendario y progreso para coaches de natación',
  description:
    'Publica horarios, administra tu calendario, toma notas de alumnos y mide su progreso. También permite encontrar y reservar coaches verificados.',
  keywords: [
    'coach de natación',
    'clases de natación',
    'calendario para coaches',
    'progreso de alumnos',
    'software para entrenadores de natación',
    'reservar coach',
    'aguas abiertas',
    'triatlón',
    'entrenador de natación',
  ],
  openGraph: {
    title: 'nadamas.app · Calendario y progreso para coaches de natación',
    description:
      'Coaches publican horarios, administran reservas, toman notas y dan seguimiento al progreso de sus alumnos.',
    url: 'https://nadamas.app/',
    siteName: 'nadamas.app',
    locale: 'es_ES',
    images: [{ url: '/og-nadamas.png', width: 1200, height: 630, alt: 'nadamas.app' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'nadamas.app · Calendario y progreso para coaches de natación',
    description: 'Horarios, calendario, notas y seguimiento de progreso para coaches de natación.',
    images: [{ url: '/og-nadamas.png', width: 1200, height: 630, alt: 'nadamas.app' }],
  },
  alternates: { canonical: 'https://nadamas.app/' },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': 'https://nadamas.app/#website',
      name: 'nadamas.app',
      url: 'https://nadamas.app',
      description:
        'Plataforma para coaches de natación con horarios publicados, calendario, reservas y seguimiento de progreso.',
      inLanguage: 'es',
      publisher: { '@id': 'https://nadamas.app/#org' },
    },
    {
      '@type': 'Organization',
      '@id': 'https://nadamas.app/#org',
      name: 'nadamas.app',
      url: 'https://nadamas.app',
      description:
        'Plataforma para coaches de natación verificados: publicación de horarios, calendario de clases, notas de alumnos, seguimiento de progreso y reservas.',
      logo: {
        '@type': 'ImageObject',
        url: 'https://nadamas.app/icons/icon_x512.png',
        width: 512,
        height: 512,
      },
    },
    {
      '@type': ['WebPage', 'FAQPage'],
      '@id': 'https://nadamas.app/#webpage',
      url: 'https://nadamas.app/',
      name: 'nadamas.app · Calendario y progreso para coaches de natación',
      description:
        'Publica horarios, administra reservas, toma notas de alumnos y mide su progreso en clases de natación.',
      inLanguage: 'es',
      isPartOf: { '@id': 'https://nadamas.app/#website' },
      about: { '@id': 'https://nadamas.app/#org' },
      mainEntity: [
        {
          '@type': 'Question',
          name: '¿Cómo pago una clase?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Pagas dentro de la app al confirmar tu reserva. El cobro se libera al coach cuando la clase queda confirmada, así no hay transferencias sueltas ni cobros pendientes.',
          },
        },
        {
          '@type': 'Question',
          name: '¿Puedo cancelar una reserva?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Sí. Cada coach define su ventana de cancelación y la verás antes de reservar. Si cancelas dentro de ese plazo, se gestiona la devolución automáticamente.',
          },
        },
        {
          '@type': 'Question',
          name: '¿Cómo me hago coach?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Creas tu perfil, añades especialidades, horarios y precios, y nuestro equipo lo revisa a mano antes de publicarlo. Cuando está aprobado, los nadadores ya pueden reservarte.',
          },
        },
        {
          '@type': 'Question',
          name: '¿Qué tipos de clase hay?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Clases privadas uno a uno y clases de grupo reducido. Cada coach decide qué ofrece, en piscina o aguas abiertas, y con qué enfoque: técnica, triatlón, principiantes o niños.',
          },
        },
        {
          '@type': 'Question',
          name: '¿Las clases son privadas?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Pueden serlo. Filtras por clases privadas si quieres atención individual, o eliges grupos pequeños si prefieres entrenar acompañado y a mejor precio.',
          },
        },
        {
          '@type': 'Question',
          name: '¿Puedo publicar mis horarios como coach?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Sí. Como coach puedes publicar horarios, precios y lugares de clase para que los nadadores encuentren disponibilidad real antes de reservar.',
          },
        },
        {
          '@type': 'Question',
          name: '¿La plataforma tiene calendario para clases?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Sí. El coach cuenta con una agenda mensual para ver sus clases por día, revisar horarios, alumno, lugar y datos de contacto.',
          },
        },
        {
          '@type': 'Question',
          name: '¿Puedo tomar notas de mis alumnos?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Sí. Cada alumno puede tener nivel, objetivo, próximo foco, notas de seguimiento y una evaluación simple de avance.',
          },
        },
        {
          '@type': 'Question',
          name: '¿Cómo mide nadamas el progreso del alumno?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'El progreso se registra con historial de clases, nivel, objetivos, foco de entrenamiento y una evaluación del coach del 1 al 5.',
          },
        },
      ],
    },
  ],
}

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is serialized from a static server-side object.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero />
      <SocialProof />
      <HowItWorks />
      <MarketplacePreview initialVisibleCount={4} showViewMoreLink />
      <Features />
      <ForCoaches />
      <ProductShots />
      <Faq />
      <FinalCta />
    </>
  )
}
