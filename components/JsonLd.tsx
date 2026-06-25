/** Renders schema.org JSON-LD structured data. Content is server-generated. */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  const html = JSON.stringify(data)
  return (
    // biome-ignore lint/security/noDangerouslySetInnerHtml: server-generated JSON-LD
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: html }} />
  )
}
