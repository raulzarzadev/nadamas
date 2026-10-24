import CoachDirectoryList from '@comps/coach/CoachDirectoryList'
import JsonLd from '@comps/JsonLd'
import type { Metadata } from 'next'
import {
  getPublicCoachDirectory,
  type PublicCoachDirectoryItem,
  publicCoachPath,
} from '@/lib/server/public-coach-directory'

const siteUrl = 'https://nadamas.app'
const description =
  'Explora coaches de natación, compara su estilo, revisa horarios publicados y reserva clases con seguimiento de progreso.'

export const metadata: Metadata = {
  title: 'Coaches de natación',
  description,
  alternates: { canonical: '/coaches' },
  openGraph: {
    title: 'Coaches de natación',
    description,
    url: '/coaches',
    siteName: 'nadamas.app',
    locale: 'es_MX',
    type: 'website',
    images: [
      {
        url: '/og-nadamas.png',
        width: 1200,
        height: 630,
        alt: 'Logo de nadamas.app',
        type: 'image/png',
      },
    ],
  },
}

async function loadDirectory(): Promise<PublicCoachDirectoryItem[] | undefined> {
  try {
    // Plain JSON so Firestore values cross the server → client boundary safely.
    return JSON.parse(JSON.stringify(await getPublicCoachDirectory()))
  } catch (error) {
    console.error('[PUBLIC_COACH_DIRECTORY_PAGE]', error)
    return undefined
  }
}

export default async function CoachesPage() {
  const coaches = await loadDirectory()
  const jsonLd = coaches?.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Coaches de natación',
        url: `${siteUrl}/coaches`,
        itemListElement: coaches.map((coach, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: coach.name,
          url: `${siteUrl}${publicCoachPath(coach)}`,
        })),
      }
    : null

  return (
    <section className="mx-auto max-w-2xl px-5 py-16 sm:px-8">
      {jsonLd && <JsonLd data={jsonLd} />}
      <h1 className="text-3xl font-extrabold text-(--c-ocean) sm:text-4xl">Coaches de natación</h1>
      <p className="mt-2 mb-6 text-(--c-text-2)">
        Explora coaches, revisa sus horarios reales y agenda tu clase.
      </p>
      <CoachDirectoryList initialCoaches={coaches} />
    </section>
  )
}
