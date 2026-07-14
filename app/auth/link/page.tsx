import { Suspense } from 'react'
import ConfirmLink from './confirm-link'

export const metadata = {
  title: 'Confirma tu acceso | Nadamas',
  robots: { index: false, follow: false },
}

export default function AuthLinkPage() {
  return (
    <Suspense>
      <ConfirmLink />
    </Suspense>
  )
}
