export const metadata = {
  robots: { index: false, follow: false },
}

export default function LogoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
