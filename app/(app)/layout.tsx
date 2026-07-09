import type { Metadata } from 'next'
import Providers from '../providers'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>
}
