/** Renders schema.org JSON-LD structured data. Content is server-generated. */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  // Escape `<` so user-provided strings (names, bios) can't close the script tag.
  const html = JSON.stringify(data).replace(/</g, '\\u003c')
  return (
    // biome-ignore lint/security/noDangerouslySetInnerHtml: server-generated JSON-LD
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: html }} />
  )
}
