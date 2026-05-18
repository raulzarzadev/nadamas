import MarketplacePreview from '@comps/marketing/marketplace-preview'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Coaches de natación · nadamas.app',
  description:
    'Explora coaches de natación, compara su estilo y encuentra horarios disponibles para reservar.',
}

export default function CoachesPage() {
  return <MarketplacePreview infiniteScroll />
}
