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
    images: ['/logo-nadamas.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'nadamas.app · Tu próximo coach de natación, a un toque',
    description:
      'Coaches verificados, reserva en minutos, paga en la app.',
    images: ['/logo-nadamas.png'],
  },
  alternates: { canonical: 'https://nadamas.app/' },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'nadamas.app',
  url: 'https://nadamas.app',
  description:
    'Marketplace premium para encontrar y reservar coaches de natación.',
  inLanguage: 'es',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://nadamas.app/?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
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
