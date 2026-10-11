'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { FiChevronRight } from 'react-icons/fi'
import CoachDirectoryList from '@/components/coach/CoachDirectoryList'
import { SearchField } from '@/components/Inputs/FormFields'

type PublicSchool = { id: string; name: string; slug: string }

export default function AthleteSearch({
  schoolId,
  initialTab = 'coaches',
}: {
  schoolId?: string
  initialTab?: 'coaches' | 'schools'
}) {
  const [tab, setTab] = useState<'coaches' | 'schools'>(initialTab)
  const [schools, setSchools] = useState<PublicSchool[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  useEffect(() => {
    let active = true
    fetch('/api/public/schools')
      .then(async (response) => {
        if (!response.ok) throw new Error('schools_unavailable')
        return response.json() as Promise<{ schools?: PublicSchool[] }>
      })
      .then((payload) => {
        if (active) setSchools(payload.schools || [])
      })
      .catch(() => {
        if (active) setError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])
  const normalize = (text: string) =>
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
  const visible = schools.filter((school) =>
    normalize(school.name).includes(normalize(query.trim()))
  )
  return (
    <div className="grid min-w-0 gap-4">
      <nav aria-label="Tipo de búsqueda" className="flex flex-wrap gap-2">
        {(
          [
            ['coaches', 'Buscar entrenadores'],
            ['schools', 'Buscar escuelas'],
          ] as const
        ).map(([value, label]) => (
          <button
            type="button"
            key={value}
            aria-pressed={tab === value}
            onClick={() => {
              setTab(value)
              window.history.replaceState(
                null,
                '',
                value === 'schools' ? '/athlete/search?school' : '/athlete/search'
              )
            }}
            className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold ${tab === value ? 'border-(--c-ocean) bg-(--c-ocean) text-white' : 'border-(--c-border) bg-white text-(--c-ocean)'}`}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === 'coaches' ? (
        <CoachDirectoryList schoolId={schoolId} coachHrefBase="/athlete/search/coach" />
      ) : (
        <>
          <SearchField
            label="Buscar escuelas"
            placeholder="Nombre de la escuela…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {loading ? (
            <p role="status" className="text-sm">
              Cargando escuelas…
            </p>
          ) : error ? (
            <p role="alert" className="text-sm">
              No pudimos cargar las escuelas. Inténtalo de nuevo más tarde.
            </p>
          ) : visible.length ? (
            <ul className="grid gap-3">
              {visible.map((school) => (
                <li key={school.id}>
                  <Link
                    href={`/athlete/search/school/${encodeURIComponent(school.id)}`}
                    className="flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-(--c-border) bg-white p-4 text-sm font-bold text-(--c-ocean)"
                  >
                    <span>{school.name}</span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs">
                      Ver escuela <FiChevronRight aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-(--c-text-2)">No encontramos escuelas.</p>
          )}
        </>
      )}
    </div>
  )
}
