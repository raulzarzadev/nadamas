'use client'

import Link from 'next/link'
import { FiArrowRight } from 'react-icons/fi'
import { useRole } from '@/context/RoleContext'
import { useUser } from '@/context/UserContext'
import { destinationForRole } from '@/lib/role-destination'

const MODES = [
  { role: 'athlete', label: 'Modo atleta' },
  { role: 'coach', label: 'Modo entrenador' },
  { role: 'school', label: 'Modo coordinador' },
] as const

export default function HomeModeLinks() {
  const { user } = useUser()
  const { roles, setActiveRole } = useRole()

  return (
    <nav aria-label="Elegir modo" className="mt-7 grid gap-3 sm:grid-cols-3">
      {MODES.map(({ role, label }) => {
        const needsActivation = role === 'coach' && !roles.coach
        return (
          <Link
            key={role}
            href={needsActivation ? '/coach/activate' : destinationForRole(role)}
            onClick={() => {
              if (user && !needsActivation) setActiveRole(role, { navigate: false })
            }}
            className="inline-flex min-h-12 items-center justify-between gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-(--c-ocean) transition-colors hover:bg-(--c-surface) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {label}
            <FiArrowRight aria-hidden="true" className="shrink-0" />
          </Link>
        )
      })}
    </nav>
  )
}
