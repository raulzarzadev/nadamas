import Comparison from '@comps/marketing/comparison'
import Faq, { FAQ_ITEMS } from '@comps/marketing/faq'
import Features, { FEATURES } from '@comps/marketing/features'
import Hero from '@comps/marketing/hero'
import HowItWorks from '@comps/marketing/how-it-works'
import PoolMoments from '@comps/marketing/pool-moments'
import PricingTeaser from '@comps/marketing/pricing-teaser'
import Summary, { PITCH_TEXT, SUMMARY_TEXT } from '@comps/marketing/summary'
import type { Metadata } from 'next'
import { NADAMAS_PRICING } from '@/lib/pricing'

const title = 'nadamas.app | App para nadadores, entrenadores y escuelas de natación'
const description = PITCH_TEXT
const shareTitle = 'nadamas.app — natación para atletas, entrenadores y clubes'
const shareDescription = PITCH_TEXT

export const metadata: Metadata = {
  metadataBase: new URL('https://nadamas.app'),
  title: { absolute: title },
  description,
  keywords: [
    'app para escuelas de natación',
    'software para escuelas de natación',
    'app para entrenadores de natación',
    'agenda de clases de natación',
    'control de asistencia natación',
    'cobro de clases de natación',
    'seguimiento de progreso natación',
    'reservar clase de natación',
    'clases de natación',
  ],
  openGraph: {
    title: shareTitle,
    description: shareDescription,
    url: 'https://nadamas.app/',
    siteName: 'nadamas.app',
    locale: 'es_MX',
    images: [
      {
        url: '/og-nadamas.png',
        width: 1200,
        height: 630,
        alt: 'Logo de nadamas.app',
        type: 'image/png',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: shareTitle,
    description: shareDescription,
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
      email: 'hola@nadamas.app',
      areaServed: { '@type': 'Country', name: 'México' },
      knowsAbout: ['natación', 'escuelas de natación', 'entrenamiento de natación'],
    },
    {
      '@type': 'SoftwareApplication',
      '@id': 'https://nadamas.app/#app',
      name: 'nadamas.app',
      url: 'https://nadamas.app/',
      applicationCategory: 'SportsApplication',
      applicationSubCategory: 'Gestión de escuelas de natación',
      operatingSystem: 'Web, iOS, Android',
      inLanguage: 'es-MX',
      description: SUMMARY_TEXT,
      image: 'https://nadamas.app/og-nadamas.png',
      video: {
        '@type': 'VideoObject',
        name: 'Entrenamientos de natación con nadamas.app',
        description: 'Nadadores entrenando en alberca al amanecer, al atardecer y de día.',
        thumbnailUrl: 'https://nadamas.app/images/landing/hero-poster.webp',
        contentUrl: 'https://nadamas.app/videos/landing-hero.mp4',
        uploadDate: '2026-10-18',
        duration: 'PT15S',
      },
      screenshot: [
        'https://nadamas.app/recursos/modo-entrenador.png',
        'https://nadamas.app/recursos/modo-coordinador.png',
        'https://nadamas.app/recursos/modo-alumno.png',
      ],
      featureList: FEATURES.map(({ title, body }) => `${title}: ${body}`),
      audience: [
        { '@type': 'Audience', audienceType: 'Entrenadores de natación' },
        { '@type': 'Audience', audienceType: 'Escuelas y clubes de natación' },
        { '@type': 'Audience', audienceType: 'Atletas y familias' },
      ],
      offers: {
        '@type': 'Offer',
        price: String(NADAMAS_PRICING.regularMonthly),
        priceCurrency: NADAMAS_PRICING.currency,
        url: 'https://nadamas.app/precio',
        category: 'subscription',
        description: 'Suscripción mensual por escuela, con todos sus profesores incluidos.',
        availability: 'https://schema.org/InStock',
      },
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
      speakable: { '@type': 'SpeakableSpecification', cssSelector: ['#que-es p', '#faq summary'] },
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
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is serialized from static server-side content.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero />
      <Summary />
      <Features />
      <HowItWorks />
      <PoolMoments />
      <Comparison />
      <PricingTeaser />
      <Faq />
    </>
  )
}
