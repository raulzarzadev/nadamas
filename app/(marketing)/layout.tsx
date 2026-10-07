import { requireTenantSchool } from '@/lib/server/tenant-school'
import '@comps/marketing/marketing-theme.css'
import MarketingNav from '@comps/marketing/marketing-nav'
import SiteFooter from '@comps/marketing/site-footer'
import Providers from '../providers'

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  await requireTenantSchool()
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
