import '@comps/marketing/marketing-theme.css'
import SiteNav from '@comps/marketing/site-nav'
import SiteFooter from '@comps/marketing/site-footer'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="marketing min-h-screen">
      <SiteNav />
      <main>{children}</main>
      <SiteFooter />
    </div>
  )
}
