'use client'

import { useState } from 'react'
import { FiArrowRight } from 'react-icons/fi'
import { useRole } from '@/context/RoleContext'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'

export default function CoachActivationPage() {
  const { roles, enableCoach, setActiveRole } = useRole()
  const [activating, setActivating] = useState(false)
  const [error, setError] = useState('')

  const activateCoachMode = async () => {
    if (roles.coach) {
      setActiveRole('coach')
      return
    }

    setActivating(true)
    setError('')
    try {
      await enableCoach()
      setActiveRole('coach')
    } catch (cause) {
      const code = reportInternalError('COACH_MODE_ENABLE_FAILED', cause)
      setError(`${GENERIC_USER_ERROR} Código: ${code}`)
    } finally {
      setActivating(false)
    }
  }

  return (
    <section
      aria-labelledby="coach-activation-title"
      className="mx-auto grid w-full max-w-4xl gap-8 rounded-[var(--r-md)] border border-(--c-border) bg-white p-6 sm:p-9 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-12"
    >
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--c-aqua-strong)">
          Modo entrenador
        </p>
        <h1
          id="coach-activation-title"
          className="mt-3 text-2xl font-extrabold text-(--c-ocean) sm:text-3xl"
        >
          Tu agenda y tus alumnos, en un solo lugar
        </h1>
        <p className="mt-3 max-w-xl leading-relaxed text-(--c-text-2)">
          Este espacio es para entrenadores que quieren organizar su agenda, publicar sus propios
          horarios y gestionar las clases de sus alumnos.
        </p>
        <p className="mt-5 text-sm text-(--c-text-2)">
          Activa el modo para empezar a configurar tu perfil y tu disponibilidad.
        </p>
        <button
          type="button"
          onClick={activateCoachMode}
          disabled={activating}
          className="btn btn-primary mt-4 min-h-11 gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong) disabled:opacity-60"
        >
          {activating
            ? 'Activando…'
            : roles.coach
              ? 'Ir a mis horarios'
              : 'Activar modo entrenador'}
          {!activating && <FiArrowRight aria-hidden="true" />}
        </button>
        {error && (
          <p role="alert" className="mt-3 text-sm text-(--c-error,#b91c1c)">
            {error}
          </p>
        )}
      </div>

      <div>
        <h2 className="text-base font-bold text-(--c-ocean)">Con este modo podrás</h2>
        <ol className="mt-4 space-y-4">
          <li className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-(--c-surface) text-sm font-bold text-(--c-ocean-mid)">
              1
            </span>
            <span>
              <span className="block font-semibold text-(--c-ocean)">Publicar tus horarios</span>
              <span className="mt-0.5 block text-sm leading-relaxed text-(--c-text-2)">
                Define cuándo estás disponible para dar clase.
              </span>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-(--c-surface) text-sm font-bold text-(--c-ocean-mid)">
              2
            </span>
            <span>
              <span className="block font-semibold text-(--c-ocean)">Organizar tu agenda</span>
              <span className="mt-0.5 block text-sm leading-relaxed text-(--c-text-2)">
                Revisa clases, espacios disponibles y bloqueos.
              </span>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-(--c-surface) text-sm font-bold text-(--c-ocean-mid)">
              3
            </span>
            <span>
              <span className="block font-semibold text-(--c-ocean)">
                Dar seguimiento a tus alumnos
              </span>
              <span className="mt-0.5 block text-sm leading-relaxed text-(--c-text-2)">
                Consulta sus clases y avances desde el mismo espacio.
              </span>
            </span>
          </li>
        </ol>
      </div>
    </section>
  )
}
