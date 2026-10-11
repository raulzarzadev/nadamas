'use client'

import { useEffect, useState } from 'react'
import { FiSearch } from 'react-icons/fi'
import ClassStudentRow from '@/components/ui/class-student-row'
import LabelFilterBar from '@/components/ui/label-filter-bar'
import { getAuthed } from '@/lib/client/authed-api'
import type { SchoolStudent } from '@/lib/school'
import AddStudentModal from './AddStudentModal'
import StudentLabels from './StudentLabels'
import type { LabelList } from './StudentLabelTools'
import StudentProfileModal from './StudentProfileModal'

type Row = {
  key: string
  id: string
  name: string
  schoolId?: string
  origins: string[]
  contexts: Array<{ id: string; schoolId?: string; name: string }>
  identities: string[]
  labels: LabelList['labels']
  selected: string[]
}

export default function CoachAllStudents({
  schools,
  personalOnly = false,
}: {
  schools: Array<{ id: string; name: string }>
  personalOnly?: boolean
}) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [label, setLabel] = useState('')
  const [profile, setProfile] = useState<Row | null>(null)
  const [revision, setRevision] = useState(0)
  const [adding, setAdding] = useState(false)
  // biome-ignore lint/correctness/useExhaustiveDependencies: revision reloads labels and profiles after edits.
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    Promise.all(
      [{ id: '', name: 'Personal' }, ...schools].map(async (source) => {
        const endpoint = source.id
          ? `/api/schools/${source.id}/students?includeSummary=true&coachOnly=true`
          : '/api/coach/students'
        const [response, labelsResponse] = await Promise.all([
          getAuthed(endpoint),
          getAuthed(
            `/api/coach/student-tags?entity=students&schoolId=${encodeURIComponent(source.id)}&view=list`
          ),
        ])
        if (!response.ok || !labelsResponse.ok) throw new Error('students_load')
        const payload = (await response.json()) as {
          students: Array<SchoolStudent & { athleteId?: string }>
        }
        const labels = (await labelsResponse.json()) as LabelList
        return payload.students.map((student): Row => {
          const id = source.id ? student.id : student.athleteId || student.id
          const identities = source.id
            ? [
                id,
                student.additionalProfileId,
                !student.additionalProfileId && student.accountParticipant !== false
                  ? student.studentUserId
                  : undefined,
              ].filter((value): value is string => Boolean(value))
            : [id]
          return {
            key: `${source.id || 'personal'}:${id}`,
            id,
            name: student.name,
            schoolId: source.id || undefined,
            origins: [source.name],
            contexts: [{ id, schoolId: source.id || undefined, name: source.name }],
            identities,
            labels: labels.labels,
            selected: labels.assignments[id] || [],
          }
        })
      })
    )
      .then((sources) => {
        if (!active) return
        const merged: Row[] = []
        for (const row of sources.flat()) {
          const matches = merged.filter((previous) =>
            previous.identities.some((id) => row.identities.includes(id))
          )
          if (!matches.length) {
            merged.push(row)
            continue
          }
          const previous = matches[0]
          for (const match of [...matches.slice(1), row]) {
            previous.identities = [...new Set([...previous.identities, ...match.identities])]
            previous.origins = [...new Set([...previous.origins, ...match.origins])]
            previous.contexts = [...previous.contexts, ...match.contexts].filter(
              (context, index, all) =>
                all.findIndex(
                  (item) => item.id === context.id && item.schoolId === context.schoolId
                ) === index
            )
            previous.labels = [
              ...new Map(
                [...previous.labels, ...match.labels].map((item) => [item.id, item])
              ).values(),
            ]
            previous.selected = [...new Set([...previous.selected, ...match.selected])]
            if (!previous.schoolId && match.schoolId) {
              previous.id = match.id
              previous.schoolId = match.schoolId
            }
          }
          for (const match of matches.slice(1)) merged.splice(merged.indexOf(match), 1)
        }
        setRows(merged.sort((a, b) => a.name.localeCompare(b.name, 'es')))
      })
      .catch(() => {
        if (active) setError('No pudimos cargar todos tus alumnos. Inténtalo de nuevo.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [schools, revision])
  const scopedRows = personalOnly
    ? rows.filter((row) => row.contexts.every((context) => !context.schoolId))
    : rows
  const labels = [
    ...new Map(
      scopedRows
        .flatMap((row) => row.labels.filter((item) => row.selected.includes(item.id)))
        .map((item) => [item.id, item])
    ).values(),
  ]
  const visible = scopedRows.filter(
    (row) =>
      (!label || row.selected.includes(label)) &&
      `${row.name} ${row.origins.join(' ')}`
        .toLocaleLowerCase('es')
        .includes(query.trim().toLocaleLowerCase('es'))
  )
  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-0 flex-1">
          <FiSearch
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-(--c-text-2)"
          />
          <input
            aria-label="Buscar alumno"
            placeholder="Buscar alumno"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-h-11 w-full rounded-full border border-(--c-border) bg-white pl-10 pr-3 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="btn btn-primary min-h-11 rounded-full"
        >
          + Agregar alumno
        </button>
      </div>
      <LabelFilterBar
        labels={labels}
        value={label}
        onChange={setLabel}
        total={scopedRows.length}
        counts={Object.fromEntries(
          labels.map((item) => [
            item.id,
            scopedRows.filter((row) => row.selected.includes(item.id)).length,
          ])
        )}
        disabled={loading}
      />
      {error ? (
        <p role="alert">{error}</p>
      ) : loading ? (
        <p className="text-sm text-(--c-text-2)">Cargando alumnos…</p>
      ) : (
        <ul className="grid gap-2">
          {visible.map((row) => (
            <li key={row.key} className="rounded-xl border border-(--c-border)">
              <ClassStudentRow
                name={row.name}
                labels={
                  <>
                    <StudentLabels
                      studentId={row.id}
                      data={{ labels: row.labels, selected: row.selected }}
                      readOnly
                      compact
                    />
                    <span className="basis-full text-[10px] text-(--c-text-2)">
                      {row.contexts.map((context, index) => (
                        <span key={`${context.schoolId || 'personal'}:${context.id}`}>
                          {index > 0 && ' · '}
                          <button
                            type="button"
                            className="hover:underline focus-visible:underline"
                            aria-label={`Ver perfil de ${row.name} en ${context.name}`}
                            onClick={() =>
                              setProfile({ ...row, id: context.id, schoolId: context.schoolId })
                            }
                          >
                            {context.name}
                          </button>
                        </span>
                      ))}
                    </span>
                  </>
                }
                onEdit={() => setProfile(row)}
                editLabel={`Ver perfil de ${row.name}`}
              />
            </li>
          ))}
          {!visible.length && (
            <li className="py-6 text-center text-sm text-(--c-text-2)">
              No hay alumnos que coincidan con estos filtros.
            </li>
          )}
        </ul>
      )}
      {adding && (
        <AddStudentModal
          onClose={() => setAdding(false)}
          onCreated={() => {
            setAdding(false)
            setRevision((value) => value + 1)
          }}
        />
      )}
      {profile && (
        <StudentProfileModal
          studentId={profile.id}
          schoolId={profile.schoolId}
          name={profile.name}
          onClose={() => {
            setProfile(null)
            setRevision((value) => value + 1)
          }}
        />
      )}
    </section>
  )
}
