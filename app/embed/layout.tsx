import '@comps/marketing/marketing-theme.css'
import Providers from '../providers'

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="marketing min-h-screen bg-transparent">{children}</div>
    </Providers>
  )
}
