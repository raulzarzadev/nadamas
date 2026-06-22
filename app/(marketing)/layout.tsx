import '@comps/marketing/marketing-theme.css'
import MarketingNav from '@comps/marketing/marketing-nav'
import SiteFooter from '@comps/marketing/site-footer'
import Providers from '../providers'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="marketing min-h-screen">
        <MarketingNav />
        <main>{children}</main>
        <SiteFooter />
      </div>
    </Providers>
  )
}
