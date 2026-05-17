'use client'
import { useUser } from '@/context/UserContext'
import Icon from '@comps/Icon'

export default function SocialMediaLogin({ disabled }) {
  const { login } = useUser()

  return (
    <div className="pt-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-[var(--c-border)]" />
        <p className="text-sm font-semibold text-[var(--c-text-2)]">
          o continúa con
        </p>
        <span className="h-px flex-1 bg-[var(--c-border)]" />
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => login('google')}
        className="btn h-12 w-full rounded-2xl border-[var(--c-border)] bg-white text-base font-semibold"
      >
        <Icon name="color-google" size="md" />
        Google
      </button>
    </div>
  )
}
