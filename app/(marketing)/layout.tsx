import { requireTenantSchool } from '@/lib/server/tenant-school'
import '@comps/marketing/marketing-theme.css'
import MarketingNav from '@comps/marketing/marketing-nav'
import SiteFooter from '@comps/marketing/site-footer'
import Providers from '../providers'

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  await requireTenantSchool()
  return (
    <Providers>
      <div className="marketing min-h-screen sm:has-[[data-app-sidebar]]:pl-56 max-sm:has-[[data-app-tabbar]]:pb-[calc(4rem+env(safe-area-inset-bottom))]">
        <MarketingNav />
        <main>{children}</main>
        <SiteFooter />
      </div>
    </Providers>
  )
}
