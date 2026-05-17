import type { Metadata } from 'next'
import Hero from '@comps/marketing/hero'
import SocialProof from '@comps/marketing/social-proof'
import HowItWorks from '@comps/marketing/how-it-works'
import MarketplacePreview from '@comps/marketing/marketplace-preview'
import Features from '@comps/marketing/features'
import ForCoaches from '@comps/marketing/for-coaches'
import ProductShots from '@comps/marketing/product-shots'
import Faq from '@comps/marketing/faq'
import FinalCta from '@comps/marketing/final-cta'

export const metadata: Metadata = {
  metadataBase: new URL('https://nadamas.app'),
  title: 'nadamas.app · Encuentra y reserva tu coach de natación',
  description:
    'Descubre coaches de natación verificados, reserva en minutos y mejora tu técnica. Aguas abiertas, triatlón, principiantes y más.',
  keywords: [
    'coach de natación',
    'clases de natación',
    'reservar coach',
    'aguas abiertas',
    'triatlón',
    'entrenador de natación',
  ],
  openGraph: {
    title: 'nadamas.app · Tu próximo coach de natación, a un toque',
    description:
      'Coaches verificados, reserva en minutos, paga en la app. Aprende, mejora y entrena.',
    url: 'https://nadamas.app/',
    siteName: 'nadamas.app',
    locale: 'es_ES',
    images: [
      { url: '/og-nadamas.png', width: 1200, height: 630, alt: 'nadamas.app' },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'nadamas.app · Tu próximo coach de natación, a un toque',
    description:
      'Coaches verificados, reserva en minutos, paga en la app.',
    images: [
      { url: '/og-nadamas.png', width: 1200, height: 630, alt: 'nadamas.app' },
    ],
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
        'Marketplace premium para encontrar y reservar coaches de natación.',
      inLanguage: 'es',
      publisher: { '@id': 'https://nadamas.app/#org' },
    },
    {
      '@type': 'Organization',
      '@id': 'https://nadamas.app/#org',
      name: 'nadamas.app',
      url: 'https://nadamas.app',
      description:
        'Marketplace para encontrar y reservar coaches de natación verificados: clases privadas o de grupo, en piscina o aguas abiertas.',
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
      name: 'nadamas.app · Encuentra y reserva tu coach de natación',
      description:
        'Descubre coaches de natación verificados, reserva en minutos y mejora tu técnica.',
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
      ],
    },
  ],
}

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero />
      <SocialProof />
      <HowItWorks />
      <MarketplacePreview />
      <Features />
      <ForCoaches />
      <ProductShots />
      <Faq />
      <FinalCta />
    </>
  )
}
