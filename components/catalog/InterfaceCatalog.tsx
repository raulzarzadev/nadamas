'use client'

import Link from 'next/link'
import { type ReactNode, useState } from 'react'
import { FiArrowLeft, FiClipboard, FiPlus, FiSettings, FiUsers } from 'react-icons/fi'
import Avatar from '@/components/ui/avatar'
import Chip from '@/components/ui/chip'
import ClassCard from '@/components/ui/class-card'
import CoachBadge from '@/components/ui/coach-badge'
import InfoModal from '@/components/ui/info-modal'
import ScheduleTag from '@/components/ui/schedule-tag'
import Sheet from '@/components/ui/sheet'
import StatusBadge from '@/components/ui/status-badge'
import StudentBadge from '@/components/ui/student-badge'
import StudentTag from '@/components/ui/student-tag'

const sections = [
  ['classes', 'Tarjetas de clase'],
  ['tags', 'Tags y estados'],
  ['people', 'Personas'],
  ['controls', 'Botones y campos'],
  ['modals', 'Modales'],
] as const

function Example({
  title,
  component,
  children,
}: {
  title: string
  component: string
  children: ReactNode
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-(--c-border) bg-white p-4 sm:p-5">
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-bold">{title}</h3>
        <code className="text-xs text-(--c-text-2)">{component}</code>
      </header>
      {children}
    </article>
  )
}

export default function InterfaceCatalog() {
  const [modal, setModal] = useState<'class' | 'note' | 'info' | null>(null)
  const [selected, setSelected] = useState(false)
  const [note, setNote] = useState('')
  const [savedNote, setSavedNote] = useState('')
  const [feedback, setFeedback] = useState('')
  const [group, setGroup] = useState(true)
  const demoStudent = (name: string) => (
    <div className="flex items-center gap-3 rounded-2xl bg-white/60 px-3 py-2">
      <Avatar name={name} tone="white" size={36} />
      <strong className="min-w-0 flex-1 truncate">{name}</strong>
      <button
        type="button"
        aria-label={`Editar nota de ${name}`}
        onClick={() => setModal('note')}
        className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-(--c-border) bg-white before:absolute before:-inset-1.5 hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-(--c-ocean)"
      >
        <FiClipboard aria-hidden="true" size={14} />
      </button>
    </div>
  )

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 text-(--c-ocean) sm:px-6 sm:py-10">
      <header className="mb-6 flex flex-col gap-3">
        <Link
          href="/dashboard"
          className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-semibold"
        >
          <FiArrowLeft aria-hidden="true" /> Volver a la aplicación
        </Link>
        <p className="text-xs font-bold uppercase tracking-widest text-(--c-text-2)">
          Nadamas · Biblioteca visual
        </p>
        <h1 className="text-3xl font-extrabold sm:text-4xl">Interfaces del proyecto</h1>
        <p className="max-w-2xl text-sm text-(--c-text-2)">
          Componentes reales que ya usamos en la aplicación. Los nombres y las clases de esta página
          son ejemplos; puedes probar las selecciones, los campos y los modales.
        </p>
      </header>
      <nav aria-label="Secciones del catálogo" className="mb-8 flex flex-wrap gap-2">
        {sections.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="btn btn-outline min-h-11 text-sm">
            {label}
          </a>
        ))}
      </nav>
      {feedback && (
        <p role="status" className="mb-4 rounded-xl bg-(--c-surface) p-3 text-sm">
          {feedback}
        </p>
      )}

      <section id="classes" className="mb-10 scroll-mt-6">
        <h2 className="mb-4 text-xl font-bold">Tarjetas de clase</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <Example title="Particular con alumno" component="ClassCard">
            <div className="@container">
              <ClassCard
                time="18:00"
                status="booked"
                coachName="Profe ejemplo"
                showCoachName
                groupType="particular"
                showSeparator={false}
                actions={
                  <button
                    type="button"
                    className="btn btn-circle btn-outline"
                    aria-label="Configurar clase de ejemplo"
                    onClick={() => setModal('class')}
                  >
                    <FiSettings aria-hidden="true" />
                  </button>
                }
              >
                {demoStudent('Alumno ejemplo')}
              </ClassCard>
            </div>
          </Example>
          <Example title="Grupal con varios alumnos" component="ClassCard">
            <div className="@container">
              <ClassCard
                time="21:00"
                status="group"
                coachName="Profe ejemplo"
                showCoachName
                groupType="grupal"
                showSeparator={false}
                addStudent={{
                  label: 'Alumno',
                  ariaLabel: 'Agregar alumno de ejemplo',
                  disabled: false,
                  onClick: () => setFeedback('Ejemplo: aquí se abre la selección de alumnos.'),
                }}
              >
                {demoStudent('Ana ejemplo')}
                {demoStudent('Luis ejemplo')}
              </ClassCard>
            </div>
          </Example>
          <Example title="Solicitud pendiente" component="ClassCard + StatusBadge">
            <div className="@container">
              <ClassCard
                time="20:00"
                status="booked"
                coachName="Profe ejemplo"
                showCoachName
                pending
                showSeparator={false}
              >
                {demoStudent('Alumno ejemplo')}
              </ClassCard>
            </div>
          </Example>
          <Example title="Disponible sin profesor" component="ClassCard">
            <div className="@container">
              <ClassCard
                time="09:00"
                status="available"
                coachName="Sin profe aún"
                unassigned
                showCoachName
                statusLabel="Disponible"
                showSeparator={false}
              />
            </div>
          </Example>
        </div>
      </section>

      <section id="tags" className="mb-10 scroll-mt-6">
        <h2 className="mb-4 text-xl font-bold">Tags y estados</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Example title="Identidad compacta de clase" component="ScheduleTag">
            <div className="grid gap-3">
              <ScheduleTag
                date="jue 8 de oct"
                time="18:00"
                coachName="Profe ejemplo"
                groupType="particular"
                enrolledCount={1}
              />
              <ScheduleTag
                date="vie 9 de oct"
                time="21:00"
                coachName="Profe ejemplo"
                groupType="grupal"
                enrolledCount={3}
              />
              <ScheduleTag
                time="09:00"
                coachName="Sin profe aún"
                unassigned
                groupType="particular"
              />
            </div>
          </Example>
          <Example title="Estado de inscripción" component="StatusBadge">
            <div className="flex flex-wrap gap-3">
              <StatusBadge status="confirmed" />
              <StatusBadge status="pending" />
              <StatusBadge status="cancelled" />
            </div>
          </Example>
          <Example title="Alumno y edición de su clase" component="StudentTag">
            <div className="grid gap-2">
              <StudentTag name="Alumno ejemplo" onEdit={() => setModal('note')} />
              <StudentTag name="Alumno pendiente" status="pending" />
            </div>
          </Example>
          <Example title="Etiqueta auxiliar" component="Chip">
            <Chip icon={<FiUsers />}>Clase grupal</Chip>
          </Example>
        </div>
      </section>

      <section id="people" className="mb-10 scroll-mt-6">
        <h2 className="mb-4 text-xl font-bold">Personas</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Example title="Profesor y selección" component="CoachBadge">
            <div className="flex flex-wrap items-center gap-3">
              <CoachBadge name="Profe ejemplo" />
              <CoachBadge name="Profe seleccionado" selected />
              <CoachBadge name="Sin profe aún" unassigned />
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => setSelected(!selected)}
                className="min-h-11 rounded-full p-1 focus-visible:outline-2"
              >
                <CoachBadge name="Seleccionar profesor" selected={selected} />
              </button>
            </div>
          </Example>
          <Example title="Alumnos y avatares" component="StudentBadge + Avatar">
            <div className="flex flex-wrap items-center gap-3">
              <StudentBadge name="Alumno ejemplo" />
              <Avatar name="Alumno ejemplo" size={32} />
              <Avatar name="Alumno ejemplo" size={44} tone="white" />
              <Avatar name="Alumno ejemplo" size={56} />
            </div>
          </Example>
        </div>
      </section>

      <section id="controls" className="mb-10 scroll-mt-6">
        <h2 className="mb-4 text-xl font-bold">Botones y campos</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Example title="Acciones y estados" component="btn">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setFeedback('Acción de ejemplo completada.')}
              >
                Guardar
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setFeedback('Selección de ejemplo limpiada.')}
              >
                Limpiar
              </button>
              <button type="button" className="btn btn-primary" disabled>
                Sin cambios
              </button>
              <button
                type="button"
                className="btn btn-circle btn-outline"
                aria-label="Agregar ejemplo"
                onClick={() => setModal('class')}
              >
                <FiPlus aria-hidden="true" />
              </button>
            </div>
          </Example>
          <Example title="Nota con guardado" component="textarea + btn">
            <label htmlFor="catalog-note" className="mb-2 block text-sm font-bold">
              Nota de esta clase
            </label>
            <textarea
              id="catalog-note"
              className="textarea w-full rounded-2xl"
              rows={3}
              value={note}
              placeholder="Escribe una observación…"
              onChange={(event) => setNote(event.target.value)}
            />
            <button
              type="button"
              disabled={note === savedNote}
              className="btn btn-primary mt-3 w-full"
              onClick={() => {
                setSavedNote(note)
                setFeedback('Nota de ejemplo guardada en esta página.')
              }}
            >
              Guardar nota
            </button>
          </Example>
        </div>
      </section>

      <section id="modals" className="mb-10 scroll-mt-6">
        <h2 className="mb-4 text-xl font-bold">Modales</h2>
        <Example title="Modal responsive y aviso informativo" component="Sheet + InfoModal">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" onClick={() => setModal('class')}>
              Abrir clase
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setModal('note')}>
              Abrir nota
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setModal('info')}>
              Abrir información
            </button>
          </div>
        </Example>
      </section>

      <Sheet open={modal === 'class'} onClose={() => setModal(null)} label="Clase de ejemplo">
        <div className="grid gap-4 px-4 sm:px-0">
          <h2 className="text-xl font-bold">Clase de ejemplo</h2>
          <div className="@container">
            <ClassCard
              time="18:00"
              status={group ? 'group' : 'booked'}
              coachName="Profe ejemplo"
              showCoachName
              groupType={group ? 'grupal' : 'particular'}
              showSeparator={false}
            >
              {demoStudent('Alumno ejemplo')}
            </ClassCard>
          </div>
          <button type="button" className="btn btn-outline" onClick={() => setGroup(!group)}>
            Cambiar a {group ? 'particular' : 'grupal'}
          </button>
        </div>
      </Sheet>
      <Sheet
        open={modal === 'note'}
        onClose={() => setModal(null)}
        label="Nota de ejemplo"
        keyboardAware
      >
        <div className="grid gap-4 px-4 sm:px-0">
          <h2 className="text-xl font-bold">Alumno ejemplo</h2>
          <label htmlFor="catalog-modal-note" className="text-sm font-bold">
            Nota de esta clase
          </label>
          <textarea
            id="catalog-modal-note"
            className="textarea w-full rounded-2xl"
            rows={4}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <button
            type="button"
            className="btn btn-primary"
            disabled={note === savedNote}
            onClick={() => {
              setSavedNote(note)
              setFeedback('Nota de ejemplo guardada.')
              setModal(null)
            }}
          >
            Guardar nota
          </button>
        </div>
      </Sheet>
      <InfoModal
        open={modal === 'info'}
        onClose={() => setModal(null)}
        label="Información de ejemplo"
      >
        Este es el aviso informativo que ya tenemos en el proyecto.
      </InfoModal>
    </main>
  )
}
