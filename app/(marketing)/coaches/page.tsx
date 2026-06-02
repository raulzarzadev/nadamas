import MarketplacePreview from '@comps/marketing/marketplace-preview'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Coaches de natación · nadamas.app',
  description:
    'Explora coaches de natación, compara su estilo, revisa horarios publicados y reserva clases con seguimiento de progreso.',
}

export default function CoachesPage() {
  return <MarketplacePreview infiniteScroll />
}
