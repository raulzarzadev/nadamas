import Providers from '../providers'
export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>
}
