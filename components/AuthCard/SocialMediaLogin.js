'use client'
import { useUser } from '@/context/UserContext'
import Icon from '@comps/Icon'

export default function SocialMediaLogin({ disabled }) {
  const { login } = useUser()

  return (
    <div className="pt-1">
      <div className="mb-3 flex items-center gap-3">
        <span className="h-px flex-1 bg-[var(--c-border)]" />
        <p className="text-xs font-medium text-[var(--c-text-2)]">
          o usa otra opción
        </p>
        <span className="h-px flex-1 bg-[var(--c-border)]" />
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => login('google')}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[var(--c-border)] bg-white text-sm font-medium text-[var(--c-text-2)] transition hover:border-[var(--c-aqua)] hover:text-[var(--c-ocean)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Icon name="color-google" size="sm" />
        Continuar con Google
      </button>
    </div>
  )
}
