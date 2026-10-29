import Link from 'next/link'
import { AuthedApiError } from '@/lib/client/authed-api'

/** Business copy from the server when a school reaches its plan limit. */
export function planLimitMessageOf(error: unknown): string | null {
  return error instanceof AuthedApiError && error.code === 'plan_limit_reached'
    ? error.message
    : null
}

const CONTACT = 'Contáctanos'

export default function PlanLimitNotice({ message }: { message: string }) {
  const link = (
    <Link href="/contacto" className="font-bold underline focus-visible:outline-2">
      {CONTACT}
    </Link>
  )
  // The server copy already says "Contáctanos": link that word instead of repeating it.
  const at = message.indexOf(CONTACT)
  return (
    <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950">
      {at === -1 ? (
        <>
          {message} {link}
        </>
      ) : (
        <>
          {message.slice(0, at)}
          {link}
          {message.slice(at + CONTACT.length)}
        </>
      )}
    </p>
  )
}
