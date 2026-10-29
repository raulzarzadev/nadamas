'use client'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import {
  FiArrowRight,
  FiCheck,
  FiCheckCircle,
  FiCreditCard,
  FiDollarSign,
  FiRefreshCw,
  FiSettings,
} from 'react-icons/fi'
import { SchoolSetupCRUD } from '@/firebase/school-setup/main'
import { getCachedAuthedData, invalidateAuthedCache } from '@/lib/client/authed-api'
import { getPublicSchoolUrl } from '@/lib/client/school-public-url'
import type { SchoolSetupSnapshot } from '@/lib/school-setup'
import { reportInternalError } from '@/lib/user-facing-error'
import SchoolNoSelection from './SchoolNoSelection'
import SchoolSelector from './SchoolSelector'
import { useSchoolSelection } from './useSchoolSelection'

export default function SchoolSetupHome() {
  const { selected, selectedId, schools, status, selectSchool } = useSchoolSelection()
  if (status === 'loading')
    return <output className="block p-5 text-sm">Cargando tu escuela…</output>
  if (status === 'error')
    return (
      <p role="alert" className="p-5">
        No pudimos cargar tus escuelas. Inténtalo de nuevo.
      </p>
    )
  if (!selected || !selectedId) return <SchoolNoSelection />
  return (
    <div className="grid gap-4">
      <SchoolSelector schools={schools} selectedId={selectedId} onChange={selectSchool} />
      <SetupChecklist key={selectedId} schoolId={selectedId} />
    </div>
  )
}
function SetupChecklist({ schoolId }: { schoolId: string }) {
  const endpoint = `/api/schools/${encodeURIComponent(schoolId)}/setup`
  const [data, setData] = useState(() => getCachedAuthedData<SchoolSetupSnapshot>(endpoint))
  const [loading, setLoading] = useState(!data)
  const [error, setError] = useState(false)
  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      setData(await SchoolSetupCRUD.get(schoolId))
    } catch (cause) {
      reportInternalError('SCHOOL_SETUP_LOAD', cause)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [schoolId])
  useEffect(() => {
    void load()
    const refresh = () => {
      invalidateAuthedCache(endpoint)
      void load()
    }
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [load, endpoint])
  if (!data && loading)
    return <output className="block p-5 text-sm">Revisando los pasos de tu escuela…</output>
  if (!data)
    return (
      <div role="alert" className="rounded-2xl border border-(--c-border) bg-white p-6">
        <p>No pudimos cargar los pasos pendientes.</p>
        <button type="button" className="btn btn-primary mt-4 min-h-11" onClick={load}>
          Volver a intentar
        </button>
      </div>
    )
  const completed = data.steps.filter((step) => step.complete).length
  const next = data.steps.find((step) => !step.complete)
  return (
    <section
      aria-labelledby="school-home-title"
      className="overflow-hidden rounded-2xl border border-(--c-border) bg-white"
    >
      <div className="border-b border-(--c-border) p-5 sm:p-7">
        <p className="text-xs font-bold uppercase tracking-widest text-(--c-text-2)">
          Inicio de tu escuela
        </p>
        <h1 id="school-home-title" className="mt-2 break-words text-2xl font-extrabold sm:text-3xl">
          {data.schoolName}
        </h1>
        <p className="mt-3 text-sm text-(--c-text-2)">
          {next
            ? 'Completa estos pasos para preparar tu escuela. Continuaremos desde donde te quedaste.'
            : 'Tu escuela está lista. Ya completaste todos los pasos de configuración.'}
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold">
            {completed} de {data.steps.length} pasos completos
          </p>
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline"
            disabled={loading}
            onClick={() => {
              invalidateAuthedCache(endpoint)
              void load()
            }}
          >
            <FiRefreshCw aria-hidden="true" />
            {loading ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>
        <progress
          aria-label="Configuración de la escuela"
          value={completed}
          max={data.steps.length}
          className="h-2 w-full accent-(--c-ocean)"
        />
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-800">
            No pudimos actualizar los pasos. Conservamos la última información; vuelve a intentarlo.
          </p>
        )}
      </div>
      <nav
        aria-label="Administrar escuela"
        className="grid gap-3 border-b border-(--c-border) p-5 sm:grid-cols-3 sm:px-7"
      >
        <Link
          href="/school/subscription"
          className="flex min-h-14 min-w-0 items-center gap-3 rounded-xl border border-(--c-border) px-4 py-3 font-bold hover:bg-(--c-surface) focus-visible:outline-2"
        >
          <FiCreditCard aria-hidden="true" className="shrink-0" />
          <span className="min-w-0 flex-1">Suscripción</span>
          <FiArrowRight aria-hidden="true" className="shrink-0" />
        </Link>
        <Link
          href="/school/payments"
          className="flex min-h-14 min-w-0 items-center gap-3 rounded-xl border border-(--c-border) px-4 py-3 font-bold hover:bg-(--c-surface) focus-visible:outline-2"
        >
          <FiDollarSign aria-hidden="true" className="shrink-0" />
          <span className="min-w-0 flex-1">Planes y pagos</span>
          <FiArrowRight aria-hidden="true" className="shrink-0" />
        </Link>
        <Link
          href="/school/settings"
          className="flex min-h-14 min-w-0 items-center gap-3 rounded-xl border border-(--c-border) px-4 py-3 font-bold hover:bg-(--c-surface) focus-visible:outline-2"
        >
          <FiSettings aria-hidden="true" className="shrink-0" />
          <span className="min-w-0 flex-1">Configuración</span>
          <FiArrowRight aria-hidden="true" className="shrink-0" />
        </Link>
      </nav>
      <ol className="divide-y divide-(--c-border)">
        {data.steps.map((step, index) => (
          <li key={step.id} className="flex min-w-0 flex-wrap items-center gap-4 p-5 sm:px-7">
            <span
              className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold ${step.complete ? 'bg-emerald-50 text-emerald-800' : 'bg-(--c-surface) text-(--c-ocean)'}`}
            >
              {step.complete ? <FiCheck aria-hidden="true" /> : index + 1}
            </span>
            <div className="min-w-0 flex-1 basis-48">
              <p className="font-bold">{step.title}</p>
              <p className="mt-1 text-sm text-(--c-text-2)">{step.description}</p>
              <p
                className={`mt-2 text-xs font-bold ${step.complete ? 'text-emerald-800' : 'text-(--c-text-2)'}`}
              >
                {step.complete ? 'Completado' : 'Pendiente'}
              </p>
            </div>
            {!step.complete && (
              <Link
                href={step.href}
                aria-label={`Configurar: ${step.title}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-(--c-border) px-4 text-sm font-bold focus-visible:outline-2"
              >
                Configurar
                <FiArrowRight aria-hidden="true" />
              </Link>
            )}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-4 border-t border-(--c-border) bg-(--c-surface) p-5 sm:px-7">
        <FiCheckCircle aria-hidden="true" />
        <Link
          href={getPublicSchoolUrl(data.slug)}
          className="inline-flex min-h-11 items-center font-bold underline"
        >
          Ver mi escuela
        </Link>
      </div>
    </section>
  )
}
