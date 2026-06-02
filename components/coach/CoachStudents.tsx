'use client'

import Loading from '@comps/Loading'
import type React from 'react'
import { useEffect, useState } from 'react'
import { FiCalendar, FiCheck, FiMail, FiPhone, FiTrendingUp, FiUser } from 'react-icons/fi'
import { getAuthed, patchAuthed } from '@/lib/client/authed-api'
import type { Booking } from '@/lib/coach-booking'
import {
  STUDENT_LEVELS,
  type StudentLevel,
  type StudentProgress,
} from '@/lib/coach-student-progress'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'

interface StudentSummary {
  athleteId: string
  name: string
  email: string | null
  phone?: string
  totalClasses: number
  nextClass?: Booking
  lastClass?: Booking
  progress?: StudentProgress | null
}

export default function CoachStudents() {
  const [students, setStudents] = useState<StudentSummary[] | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAuthed('/api/coach/students')
      .then((response) => response.json())
      .then((payload: { students?: StudentSummary[] }) => setStudents(payload.students || []))
      .catch((err) => {
        reportInternalError('COACH_STUDENTS_LOAD', err)
        setError(GENERIC_USER_ERROR)
        setStudents([])
      })
  }, [])

  if (students === undefined) return <Loading />

  if (!students.length) {
    return (
      <div className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-[var(--c-surface)] p-10 text-center text-[var(--c-text-2)]">
        {error || 'Aún no tienes alumnos'}
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      {students.map((student) => (
        <StudentCard
          key={student.athleteId}
          student={student}
          onSaved={(progress) =>
            setStudents((current) =>
              current?.map((item) =>
                item.athleteId === student.athleteId ? { ...item, progress } : item
              )
            )
          }
        />
      ))}
    </div>
  )
}

function StudentCard({
  student,
  onSaved,
}: {
  student: StudentSummary
  onSaved: (progress: StudentProgress) => void
}) {
  const [level, setLevel] = useState<StudentLevel>(student.progress?.level || 'Inicial')
  const [coachAssessment, setCoachAssessment] = useState(student.progress?.coachAssessment || 1)
  const [goal, setGoal] = useState(student.progress?.goal || '')
  const [nextFocus, setNextFocus] = useState(student.progress?.nextFocus || '')
  const [lastNote, setLastNote] = useState(student.progress?.lastNote || '')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  async function saveProgress() {
    setStatus('saving')
    try {
      const response = await patchAuthed('/api/coach/students', {
        athleteId: student.athleteId,
        level,
        coachAssessment,
        goal,
        nextFocus,
        lastNote,
      })
      const payload = (await response.json()) as { progress: StudentProgress }
      onSaved(payload.progress)
      setStatus('saved')
    } catch (err) {
      reportInternalError('COACH_STUDENT_SAVE', err)
      setStatus('error')
    }
  }

  return (
    <article className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-5 shadow-[var(--shadow-sm)]">
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-2 text-lg font-bold text-[var(--c-ocean)]">
              <FiUser aria-hidden="true" />
              {student.name}
            </p>
            {student.email && (
              <p className="flex items-center gap-2 text-sm text-[var(--c-text-2)]">
                <FiMail aria-hidden="true" />
                {student.email}
              </p>
            )}
            {student.phone && (
              <p className="flex items-center gap-2 text-sm text-[var(--c-text-2)]">
                <FiPhone aria-hidden="true" />
                {student.phone}
              </p>
            )}
            {student.nextClass && (
              <p className="flex items-center gap-2 text-sm text-[var(--c-text-2)]">
                <FiCalendar aria-hidden="true" />
                Próxima: {student.nextClass.date} · {student.nextClass.startTime}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <MetricPill
              icon={<FiCalendar aria-hidden="true" />}
              label="Clases"
              value={student.totalClasses}
            />
            <MetricPill
              icon={<FiTrendingUp aria-hidden="true" />}
              label="Avance"
              value={`${coachAssessment}/5`}
            />
          </div>
        </div>

        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
            <label className="grid gap-1 text-sm font-semibold text-[var(--c-ocean)]">
              Nivel
              <select
                value={level}
                onChange={(event) => setLevel(event.target.value as StudentLevel)}
                className="min-h-11 rounded-[var(--r-sm)] border border-[var(--c-border)] bg-white px-3 text-sm text-[var(--c-ocean)]"
              >
                {STUDENT_LEVELS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold text-[var(--c-ocean)]">
              Avance
              <input
                type="number"
                min="1"
                max="5"
                value={coachAssessment}
                onChange={(event) => setCoachAssessment(Number(event.target.value))}
                className="min-h-11 rounded-[var(--r-sm)] border border-[var(--c-border)] bg-white px-3 text-sm text-[var(--c-ocean)]"
              />
            </label>
          </div>
          <label className="grid gap-1 text-sm font-semibold text-[var(--c-ocean)]">
            Objetivo
            <input
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              maxLength={240}
              placeholder="Ej. mejorar respiración bilateral"
              className="min-h-11 rounded-[var(--r-sm)] border border-[var(--c-border)] bg-white px-3 text-sm text-[var(--c-ocean)]"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-[var(--c-ocean)]">
            Próximo foco
            <input
              value={nextFocus}
              onChange={(event) => setNextFocus(event.target.value)}
              maxLength={240}
              placeholder="Ej. salida y patada constante"
              className="min-h-11 rounded-[var(--r-sm)] border border-[var(--c-border)] bg-white px-3 text-sm text-[var(--c-ocean)]"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-[var(--c-ocean)]">
            Nota privada para seguimiento
            <textarea
              value={lastNote}
              onChange={(event) => setLastNote(event.target.value)}
              maxLength={800}
              rows={3}
              placeholder="Observaciones de técnica, asistencia o tareas para la siguiente clase."
              className="rounded-[var(--r-sm)] border border-[var(--c-border)] bg-white px-3 py-2 text-sm text-[var(--c-ocean)]"
            />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="min-h-5 text-sm text-[var(--c-text-2)]">
              {status === 'saved' && 'Seguimiento guardado.'}
              {status === 'error' && GENERIC_USER_ERROR}
            </p>
            <button
              type="button"
              onClick={saveProgress}
              disabled={status === 'saving'}
              className="inline-flex min-h-11 items-center gap-2 rounded-[var(--r-sm)] bg-[var(--c-ocean)] px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              <FiCheck aria-hidden="true" />
              {status === 'saving' ? 'Guardando' : 'Guardar progreso'}
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

function MetricPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2 rounded-[var(--r-sm)] bg-[var(--c-surface)] px-3 py-2 text-sm text-[var(--c-ocean)]">
      <span className="text-[var(--c-ocean-mid)]">{icon}</span>
      <span className="text-[var(--c-text-2)]">{label}</span>
      <strong className="ml-auto">{value}</strong>
    </div>
  )
}
