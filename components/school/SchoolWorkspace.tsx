'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { FiArrowUpRight, FiCalendar, FiGlobe, FiShield, FiUsers } from 'react-icons/fi'
import { getAuthed } from '@/lib/client/authed-api'
import type { School, SchoolMembership } from '@/lib/school'

interface SchoolAccess {
  school: School
  membership: SchoolMembership
}

interface SchoolsPayload {
  schools?: SchoolAccess[]
  ownedSchool?: School | null
}

const WORKSPACE_TOOLS = [
  {
    href: '/school/students',
    title: 'Alumnos',
    body: 'Invitaciones y perfiles de alumnos.',
    icon: FiUsers,
    tone: 'bg-(--c-surface) text-(--c-ocean-mid)',
  },
  {
    href: '/school/coaches',
    title: 'Profes',
    body: 'Profesores, perfiles y horarios disponibles.',
    icon: FiShield,
    tone: 'bg-[#fff7e8] text-[#9a6b16]',
  },
  {
    href: '/school/classes',
    title: 'Horarios',
    body: 'Agenda mezclada de todos los coaches y clases programadas.',
    icon: FiCalendar,
    tone: 'bg-[#eef7f1] text-[#0a7d4b]',
  },
]

export default function SchoolWorkspace() {
  const router = useRouter()
  const [schools, setSchools] = useState<SchoolAccess[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    const stored = window.localStorage.getItem('nadamas.schoolId')

    getAuthed('/api/schools')
      .then((response) => response.json() as Promise<SchoolsPayload>)
      .then((payload) => {
        const nextSchools = payload.schools || []
        if (!nextSchools.length) {
          router.replace('/school/create')
          return
        }
        setSchools(nextSchools)
        const preferred =
          (stored && nextSchools.some((item) => item.school.id === stored) && stored) ||
          payload.ownedSchool?.id ||
          nextSchools[0].school.id
        setSelectedId(preferred)
        window.localStorage.setItem('nadamas.schoolId', preferred)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [router])

  const selected = useMemo(
    () => schools.find((item) => item.school.id === selectedId) || schools[0],
    [schools, selectedId]
  )

  function selectSchool(schoolId: string) {
    setSelectedId(schoolId)
    window.localStorage.setItem('nadamas.schoolId', schoolId)
  }

  if (status === 'loading') {
    return <div className="py-16 text-center text-sm text-(--c-text-2)">Cargando tu escuela…</div>
  }

  if (status === 'error') {
    return (
      <div className="rounded-[var(--r-md)] border border-(--c-border) bg-white p-6 text-sm text-(--c-text-2)">
        No pudimos cargar tus escuelas. Intenta actualizar la página.
      </div>
    )
  }

  if (!selected) return null

  return (
    <section className="flex flex-col gap-6">
      {schools.length > 1 && (
        <label className="flex items-center gap-3 self-end text-xs font-bold uppercase tracking-wide text-(--c-text-2)">
          Escuela activa
          <select
            aria-label="Cambiar escuela"
            value={selected.school.id}
            onChange={(event) => selectSchool(event.target.value)}
            className="min-h-9 max-w-40 rounded-[var(--r-sm)] border border-(--c-border) bg-white px-2 text-xs font-semibold normal-case tracking-normal text-(--c-ocean)"
          >
            {schools.map(({ school }) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        {WORKSPACE_TOOLS.map((tool) => {
          const Icon = tool.icon
          return (
            <Link
              key={tool.href}
              href={tool.href}
              className="group flex min-h-40 flex-col justify-between rounded-[var(--r-md)] border border-(--c-border) bg-white p-5 shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong)"
            >
              <span className={`grid h-11 w-11 place-items-center rounded-full ${tool.tone}`}>
                <Icon aria-hidden="true" />
              </span>
              <span>
                <span className="flex items-center gap-1 font-bold text-(--c-ocean)">
                  {tool.title}
                  <FiArrowUpRight
                    aria-hidden="true"
                    className="text-(--c-text-2) transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </span>
                <span className="mt-1 block text-sm text-(--c-text-2)">{tool.body}</span>
              </span>
            </Link>
          )
        })}
      </div>

      <div className="flex items-start gap-3 rounded-[var(--r-md)] border border-(--c-border) bg-white p-5 text-sm text-(--c-text-2)">
        <FiGlobe aria-hidden="true" className="mt-0.5 shrink-0 text-(--c-ocean-mid)" />
        <p>
          Eres{' '}
          <strong className="text-(--c-ocean)">
            {(selected.membership.roles || [selected.membership.role]).join(', ')}
          </strong>{' '}
          de esta escuela. Desde este modo, las herramientas de escuela permanecen separadas de tus
          clases como atleta o coach.
        </p>
      </div>
    </section>
  )
}
