import AuthenticatedLandingGate from '@comps/marketing/AuthenticatedLandingGate'
import CoachesTeaser from '@comps/marketing/coaches-teaser'
import Faq, { FAQ_ITEMS } from '@comps/marketing/faq'
import Features from '@comps/marketing/features'
import FinalCta from '@comps/marketing/final-cta'
import Hero from '@comps/marketing/hero'
import HowItWorks from '@comps/marketing/how-it-works'
import type { Metadata } from 'next'

const title = 'nadamas.app | Clases, agenda y progreso de natación'
const description =
  'Una app de natación para atletas, entrenadores y coordinadores de escuelas. Consulta horarios, reserva clases, gestiona alumnos y sigue su progreso.'

export const metadata: Metadata = {
  metadataBase: new URL('https://nadamas.app'),
  title: { absolute: title },
  description,
  keywords: [
    'clases de natación',
    'entrenadores de natación',
    'agenda para entrenadores',
    'escuelas de natación',
    'clases grupales de natación',
    'progreso de atletas',
    'reservar clase de natación',
  ],
  openGraph: {
    title,
    description,
    url: 'https://nadamas.app/',
    siteName: 'nadamas.app',
    locale: 'es_MX',
    images: [{ url: '/og-nadamas.png', width: 1200, height: 630, alt: 'nadamas.app' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
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
      url: 'https://nadamas.app/',
      description,
      inLanguage: 'es-MX',
      publisher: { '@id': 'https://nadamas.app/#org' },
    },
    {
      '@type': 'Organization',
      '@id': 'https://nadamas.app/#org',
      name: 'nadamas.app',
      url: 'https://nadamas.app/',
      logo: {
        '@type': 'ImageObject',
        url: 'https://nadamas.app/icons/icon_x512.png',
        width: 512,
        height: 512,
      },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': 'https://nadamas.app/#app',
      name: 'nadamas.app',
      url: 'https://nadamas.app/',
      applicationCategory: 'SportsApplication',
      operatingSystem: 'Web',
      inLanguage: 'es-MX',
      description,
      publisher: { '@id': 'https://nadamas.app/#org' },
    },
    {
      '@type': ['WebPage', 'FAQPage'],
      '@id': 'https://nadamas.app/#webpage',
      url: 'https://nadamas.app/',
      name: title,
      description,
      inLanguage: 'es-MX',
      isPartOf: { '@id': 'https://nadamas.app/#website' },
      about: { '@id': 'https://nadamas.app/#app' },
      mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    },
  ],
}

export default function LandingPage() {
  return (
    <AuthenticatedLandingGate>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is serialized from static server-side content.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero />
      <HowItWorks />
      <Features />
      <CoachesTeaser />
      <Faq />
      <FinalCta />
    </AuthenticatedLandingGate>
  )
}
