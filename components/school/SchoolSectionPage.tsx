'use client'

import Link from 'next/link'
import { FiArrowLeft, FiCalendar, FiPlus, FiShield, FiUsers } from 'react-icons/fi'

const SECTION_CONFIG = {
  students: {
    title: 'Alumnos',
    eyebrow: 'Comunidad escolar',
    description: 'Gestiona alumnos e invitaciones de tu escuela.',
    empty: 'Aquí aparecerán los alumnos de tu escuela.',
    icon: FiUsers,
  },
  coaches: {
    title: 'Profes',
    eyebrow: 'Equipo de profesores',
    description: 'Invita profesores y organiza sus perfiles y disponibilidad.',
    empty: 'Aquí aparecerán los coaches que formen parte de tu escuela.',
    icon: FiShield,
  },
  classes: {
    title: 'Horarios',
    eyebrow: 'Agenda escolar',
    description: 'Consulta los horarios mezclados de todos los coaches y programa clases.',
    empty: 'Aquí aparecerán las solicitudes y clases asignadas.',
    icon: FiCalendar,
  },
} as const

export type SchoolSection = keyof typeof SECTION_CONFIG

export default function SchoolSectionPage({ section }: { section: SchoolSection }) {
  const config = SECTION_CONFIG[section]
  const Icon = config.icon

  return (
    <section className="flex flex-col gap-5">
      <Link
        href="/school"
        className="inline-flex items-center gap-2 text-sm font-semibold text-(--c-ocean-mid)"
      >
        <FiArrowLeft aria-hidden="true" /> Regresar al panel
      </Link>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--c-aqua-strong)">
            {config.eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-(--c-ocean)">{config.title}</h1>
          <p className="mt-1 text-(--c-text-2)">{config.description}</p>
        </div>
        <button type="button" disabled className="btn btn-primary min-h-11 gap-2 opacity-60">
          <FiPlus aria-hidden="true" /> Próximamente
        </button>
      </div>
      <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-[var(--r-md)] border border-dashed border-(--c-ocean-mid) bg-white p-8 text-center shadow-[var(--shadow-sm)]">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-(--c-surface) text-2xl text-(--c-ocean-mid)">
          <Icon aria-hidden="true" />
        </span>
        <h2 className="text-lg font-bold text-(--c-ocean)">{config.empty}</h2>
        <p className="max-w-md text-sm text-(--c-text-2)">
          Estamos conectando esta sección con las invitaciones, perfiles y agenda de tu escuela.
        </p>
      </div>
    </section>
  )
}
