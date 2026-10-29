'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { FiArrowRight, FiCheck, FiCopy, FiHome, FiUser, FiUsers } from 'react-icons/fi'
import { useRole } from '@/context/RoleContext'
import { useUser } from '@/context/UserContext'
import { OnboardingCRUD } from '@/firebase/onboarding/main'
import type { CoachContext, OnboardingInput, ProfileInterest } from '@/lib/onboarding/model'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'
import { setupPaths } from './setup-paths'

const options = [
  {
    id: 'swimmer' as const,
    title: 'Soy nadador',
    description: 'Quiero encontrar un profe, una escuela o un entreno para mí.',
    icon: FiUser,
  },
  {
    id: 'coach' as const,
    title: 'Soy entrenador',
    description: 'Entreno por mi cuenta, trabajo en una escuela o hago ambas cosas.',
    icon: FiUsers,
  },
  {
    id: 'coordinator' as const,
    title: 'Coordino una escuela',
    description: 'Tengo una escuela y varios profes a mi cargo, o quiero crearla.',
    icon: FiHome,
  },
]
const primary =
  'inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-(--c-ocean) px-6 py-3 text-sm font-bold text-white transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--c-ocean) disabled:cursor-not-allowed disabled:opacity-40'
export default function WelcomeSetup() {
  const { user, refreshUser } = useUser()
  const { setActiveRole } = useRole()
  const [interests, setInterests] = useState<ProfileInterest[]>([])
  const [coachContext, setCoachContext] = useState<CoachContext>('independent')
  const [phase, setPhase] = useState<'choose' | 'steps'>('choose')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { onboarding } = await OnboardingCRUD.get()
      if (onboarding) {
        setInterests(onboarding.interests)
        setCoachContext(onboarding.coachContext || 'independent')
        setPhase('steps')
      }
    } catch (cause) {
      reportInternalError('WELCOME_LOAD', cause)
      setError(GENERIC_USER_ERROR)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])
  function toggle(id: ProfileInterest) {
    setInterests((values) =>
      values.includes(id) ? values.filter((value) => value !== id) : [...values, id]
    )
  }
  async function save() {
    if (saving || !interests.length) return
    setSaving(true)
    setError('')
    try {
      await OnboardingCRUD.save({
        interests,
        coachContext: interests.includes('coach') ? coachContext : null,
      })
      await refreshUser()
      setPhase('steps')
    } catch (cause) {
      reportInternalError('WELCOME_SAVE', cause)
      setError(GENERIC_USER_ERROR)
    } finally {
      setSaving(false)
    }
  }
  const input: OnboardingInput = { interests, coachContext }
  return (
    <div className="min-h-dvh bg-(--c-bg) text-(--c-ocean)">
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <Link href="/" aria-label="Nadamas, inicio">
          <Image
            src="/logo-nadamas.webp"
            alt=""
            width={293}
            height={100}
            className="h-8 w-auto"
            priority
          />
        </Link>
        <Link
          href="/profile"
          className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4 focus-visible:outline-2"
        >
          Mi cuenta
        </Link>
      </header>
      <main className="mx-auto max-w-5xl px-5 pb-36 pt-5 sm:px-8 sm:pt-10">
        <div className="mb-7 flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-(--c-text-2)">
          <span className="grid size-7 place-items-center rounded-full bg-(--c-ocean) text-white">
            {phase === 'choose' ? '1' : '2'}
          </span>
          {phase === 'choose' ? 'Tu perfil' : 'Tus primeros pasos'}
          <span aria-hidden="true" className="h-px w-12 bg-(--c-border)" />
        </div>
        <h1 className="max-w-2xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          {phase === 'choose'
            ? 'Vamos a configurar tu perfil.'
            : interests.length > 1
              ? 'Un perfil. Todas tus facetas.'
              : 'Todo listo para empezar.'}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-(--c-text-2)">
          {phase === 'choose'
            ? 'Cuéntanos cómo quieres usar Nadamas. Puedes elegir varias opciones y cambiarlas después.'
            : 'Elige tu próximo paso. Puedes volver aquí desde tu perfil cuando quieras.'}
        </p>
        {loading ? (
          <output className="mt-8 block rounded-2xl border border-(--c-border) bg-white p-6 text-sm">
            Preparando tu configuración…
          </output>
        ) : error && !interests.length ? (
          <div role="alert" className="mt-8 rounded-2xl border border-(--c-border) bg-white p-6">
            <p>{error}</p>
            <button type="button" onClick={load} className={`${primary} mt-4`}>
              Volver a intentar
            </button>
          </div>
        ) : phase === 'choose' ? (
          <form
            id="welcome-setup"
            onSubmit={(event) => {
              event.preventDefault()
              void save()
            }}
            className="mt-8 max-w-3xl"
          >
            <fieldset disabled={saving} className="grid gap-3">
              <legend className="sr-only">¿Cómo quieres usar Nadamas?</legend>
              {options.map(({ id, title, description, icon: Icon }) => (
                <label
                  key={id}
                  className={`relative flex min-h-28 cursor-pointer items-start gap-4 rounded-2xl border p-5 transition focus-within:ring-2 focus-within:ring-(--c-ocean) sm:p-6 ${interests.includes(id) ? 'border-(--c-ocean) bg-white' : 'border-(--c-border) bg-white hover:border-(--c-ocean)'}`}
                >
                  <span
                    className={`grid size-11 shrink-0 place-items-center rounded-xl ${interests.includes(id) ? 'bg-(--c-ocean) text-white' : 'bg-(--c-surface)'}`}
                  >
                    <Icon size={21} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-bold">{title}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-(--c-text-2)">
                      {description}
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    aria-label={title}
                    checked={interests.includes(id)}
                    onChange={() => toggle(id)}
                    className="mt-1 size-5 shrink-0 accent-(--c-ocean)"
                  />
                </label>
              ))}
            </fieldset>
            {interests.includes('coach') && (
              <fieldset
                disabled={saving}
                className="mt-6 rounded-2xl border border-(--c-border) bg-white p-5"
              >
                <legend className="px-2 text-sm font-bold">¿Cómo trabajas como entrenador?</legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(
                    [
                      { id: 'independent', label: 'Por mi cuenta' },
                      { id: 'school', label: 'En una escuela' },
                      { id: 'both', label: 'De ambas formas' },
                    ] as const
                  ).map((item) => (
                    <label
                      key={item.id}
                      className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm focus-within:ring-2 focus-within:ring-(--c-ocean)"
                    >
                      <input
                        type="radio"
                        name="coach-context"
                        value={item.id}
                        checked={coachContext === item.id}
                        onChange={() => setCoachContext(item.id)}
                        className="size-5 accent-(--c-ocean)"
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            {interests.length > 1 && (
              <p className="mt-5 flex items-start gap-2 text-sm">
                <FiCheck className="mt-1 shrink-0" aria-hidden="true" />
                Combinaremos los pasos de tus perfiles. No necesitas crear otra cuenta.
              </p>
            )}
            {error && (
              <p role="alert" className="mt-4 text-sm text-red-800">
                {error}
              </p>
            )}
          </form>
        ) : (
          <div className="mt-10 grid gap-8">
            {setupPaths(input).map((path) => (
              <section
                key={path.id}
                aria-labelledby={`setup-${path.id}`}
                className="overflow-hidden rounded-2xl border border-(--c-border) bg-white"
              >
                <div className="border-b border-(--c-border) p-5 sm:p-6">
                  <h2 id={`setup-${path.id}`} className="text-xl font-bold">
                    {path.title}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-(--c-text-2)">
                    {path.introduction}
                  </p>
                </div>
                <ol className="divide-y divide-(--c-border)">
                  {path.actions.map((action, index) => (
                    <li key={action.title}>
                      <Link
                        href={action.href}
                        onClick={() => setActiveRole(action.role, { navigate: false })}
                        className="group flex min-h-24 items-center gap-4 px-5 py-5 transition hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-offset-[-3px] sm:px-6"
                      >
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-(--c-surface) text-xs font-bold">
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-bold group-hover:underline">
                            {action.title}
                          </span>
                          <span className="mt-1 block text-sm text-(--c-text-2)">
                            {action.description}
                          </span>
                        </span>
                        <FiArrowRight aria-hidden="true" className="shrink-0" />
                      </Link>
                    </li>
                  ))}
                </ol>
                {path.id === 'coach' && (
                  <div className="border-t border-(--c-border) p-5 sm:px-6">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const uid = user?.uid || user?.id
                          if (!uid) return
                          await navigator.clipboard.writeText(
                            `${window.location.origin}/coach/${encodeURIComponent(uid)}`
                          )
                          setCopied(true)
                        } catch (cause) {
                          reportInternalError('WELCOME_COPY', cause)
                          setError('No pudimos copiar el enlace. Abre tu perfil para compartirlo.')
                        }
                      }}
                      className="inline-flex min-h-11 items-center gap-2 font-bold underline underline-offset-4 focus-visible:outline-2"
                    >
                      <FiCopy aria-hidden="true" />
                      Compartir mi perfil
                    </button>
                    <output className="ml-3 text-sm">{copied ? 'Enlace copiado' : ''}</output>
                  </div>
                )}
              </section>
            ))}
            {error && (
              <p role="alert" className="text-sm text-red-800">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                setPhase('choose')
                setError('')
              }}
              className="min-h-11 justify-self-start text-sm font-bold underline underline-offset-4 focus-visible:outline-2"
            >
              Cambiar mis opciones
            </button>
          </div>
        )}
      </main>
      {phase === 'choose' && !loading && (
        <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-(--c-border) bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-8">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-(--c-text-2)">
              {interests.length
                ? `${interests.length} ${interests.length === 1 ? 'perfil seleccionado' : 'perfiles seleccionados'}`
                : 'Elige al menos una opción para continuar.'}
            </p>
            <button
              type="submit"
              form="welcome-setup"
              disabled={!interests.length || saving || Boolean(error && !interests.length)}
              className={`${primary} w-full sm:w-auto`}
            >
              {saving ? 'Guardando…' : 'Ver mis primeros pasos'}
              <FiArrowRight aria-hidden="true" />
            </button>
          </div>
        </footer>
      )}
    </div>
  )
}
