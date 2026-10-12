import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { resources } from '@/lib/marketing/resources'
import { marketingMetadata, siteUrl } from '@/lib/marketing/seo'

interface Props {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return resources.map(({ slug }) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const resource = resources.find((item) => item.slug === slug)
  if (!resource) return { title: 'Recurso no encontrado', robots: { index: false } }
  const metadata = marketingMetadata(resource.title, resource.description, `/recursos/${slug}`)
  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      type: 'article',
      modifiedTime: resource.updatedAt,
      authors: ['nadamas.app'],
    },
  }
}

export default async function ResourcePage({ params }: Props) {
  const { slug } = await params
  const resource = resources.find((item) => item.slug === slug)
  if (!resource) notFound()
  const url = `${siteUrl}/recursos/${slug}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: resource.title,
        description: resource.description,
        url,
        mainEntityOfPage: url,
        inLanguage: 'es-MX',
        dateModified: resource.updatedAt,
        author: { '@type': 'Organization', name: 'nadamas.app', url: siteUrl },
        publisher: { '@type': 'Organization', name: 'nadamas.app', url: siteUrl },
        image: `${siteUrl}/og-nadamas.png`,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: siteUrl },
          { '@type': 'ListItem', position: 2, name: 'Recursos', item: `${siteUrl}/recursos` },
          { '@type': 'ListItem', position: 3, name: resource.title, item: url },
        ],
      },
    ],
  }
  return (
    <article className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-20">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Static editorial data, escaped before serialization into HTML.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <nav aria-label="Ruta de navegación" className="text-sm text-(--c-text-2)">
        <Link href="/">Inicio</Link> / <Link href="/recursos">Recursos</Link>
      </nav>
      <p className="mt-8 text-sm font-bold uppercase text-(--c-aqua-strong)">{resource.category}</p>
      <h1 className="mt-3 text-3xl font-extrabold sm:text-5xl">{resource.title}</h1>
      <p className="mt-6 text-lg leading-relaxed text-(--c-text-2)">{resource.description}</p>
      <p className="mt-4 text-sm text-(--c-text-2)">
        Por <Link href="/">nadamas.app</Link> · Actualizado el{' '}
        <time dateTime={resource.updatedAt}>
          {new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeZone: 'UTC' }).format(
            new Date(resource.updatedAt)
          )}
        </time>
      </p>
      {resource.download && (
        <a
          href={resource.download.href}
          download
          className="mt-6 inline-flex min-h-12 items-center rounded-full bg-(--c-ocean) px-6 py-3 font-bold text-white"
        >
          {resource.download.label}
        </a>
      )}
      <nav
        aria-label="Contenido de la guía"
        className="mt-10 rounded-2xl border border-(--c-border) bg-(--c-surface) p-6"
      >
        <p className="font-bold">En este recurso</p>
        <ul className="mt-3 space-y-3">
          {resource.sections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="text-(--c-aqua-strong) hover:underline">
                {section.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      {resource.sections.map((section) => (
        <section key={section.id} id={section.id} className="mt-12 scroll-mt-24">
          <h2 className="text-2xl font-bold">{section.title}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="mt-4 leading-8 text-(--c-text-2)">
              {paragraph}
            </p>
          ))}
          {section.items && (
            <ul className="mt-4 list-disc space-y-3 pl-6 text-(--c-text-2)">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
      <aside className="mt-12 rounded-2xl bg-(--c-surface) p-6">
        <h2 className="text-2xl font-bold">Lleva el seguimiento a tus clases</h2>
        <p className="mt-3 leading-relaxed text-(--c-text-2)">
          Organiza alumnos, agenda, notas y evaluaciones con Nadamas.
        </p>
        <Link
          href="/software-para-escuelas-de-natacion"
          className="mt-4 inline-flex min-h-11 items-center font-bold text-(--c-aqua-strong)"
        >
          Conocer las funciones para escuelas →
        </Link>
      </aside>
      <section className="mt-10">
        <h2 className="text-xl font-bold">Sigue explorando</h2>
        {resources
          .filter((item) => item.slug !== slug)
          .map((item) => (
            <Link
              key={item.slug}
              href={`/recursos/${item.slug}`}
              className="mt-4 block py-2 font-semibold text-(--c-aqua-strong) hover:underline"
            >
              {item.title} →
            </Link>
          ))}
      </section>
    </article>
  )
}
