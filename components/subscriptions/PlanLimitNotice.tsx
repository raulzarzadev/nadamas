import Link from 'next/link'
import { AuthedApiError } from '@/lib/client/authed-api'

/** Business copy from the server when a school reaches its plan limit. */
export function planLimitMessageOf(error: unknown): string | null {
  return error instanceof AuthedApiError && error.code === 'plan_limit_reached'
    ? error.message
    : null
}

/** For people who cannot change the plan (athletes, invitees, teachers). */
export const PLAN_LIMIT_MEMBER_MESSAGE =
  'La escuela llegó al límite de su plan. Avísale a la escuela.'

/** Member-facing copy when the error is a plan limit, else null. */
export function planLimitMemberMessageOf(error: unknown): string | null {
  return planLimitMessageOf(error) === null ? null : PLAN_LIMIT_MEMBER_MESSAGE
}

const CONTACT = 'Contáctanos'

/** The message with its "Contáctanos" linked to /contacto (appended when the copy lacks it). */
export function PlanLimitText({ message }: { message: string }) {
  const link = (
    <Link href="/contacto" className="font-bold underline focus-visible:outline-2">
      {CONTACT}
    </Link>
  )
  const at = message.indexOf(CONTACT)
  if (at === -1)
    return (
      <>
        {message} {link}
      </>
    )
  return (
    <>
      {message.slice(0, at)}
      {link}
      {message.slice(at + CONTACT.length)}
    </>
  )
}

export default function PlanLimitNotice({
  message,
  role = 'alert',
}: {
  message: string
  /** `status` for a persistent notice; `alert` for the result of an action. */
  role?: 'alert' | 'status'
}) {
  return (
    <p role={role} className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950">
      <PlanLimitText message={message} />
    </p>
  )
}
