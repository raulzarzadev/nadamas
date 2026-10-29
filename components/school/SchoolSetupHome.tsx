'use client'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import {
  FiArrowLeft,
  FiArrowRight,
  FiCheck,
  FiCheckCircle,
  FiCreditCard,
  FiDollarSign,
  FiRefreshCw,
  FiSettings,
  FiShare2,
} from 'react-icons/fi'
import { SchoolSetupCRUD } from '@/firebase/school-setup/main'
import { getCachedAuthedData, invalidateAuthedCache } from '@/lib/client/authed-api'
import { copyTextToClipboard } from '@/lib/client/copy-to-clipboard'
import { getPublicSchoolUrl, getShareablePublicSchoolUrl } from '@/lib/client/school-public-url'
import type { SchoolSetupSnapshot } from '@/lib/school-setup'
import { schoolSubscriptionHint } from '@/lib/school-subscription-hint'
import { reportInternalError } from '@/lib/user-facing-error'
import SchoolNoSelection from './SchoolNoSelection'
import SchoolSelector from './SchoolSelector'
import { useSchoolSelection } from './useSchoolSelection'

export default function SchoolSetupHome({ view = 'home' }: { view?: 'home' | 'steps' }) {
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
      <SetupChecklist key={selectedId} schoolId={selectedId} view={view} />
    </div>
  )
}
function SetupChecklist({ schoolId, view }: { schoolId: string; view: 'home' | 'steps' }) {
  const endpoint = `/api/schools/${encodeURIComponent(schoolId)}/setup`
  const [data, setData] = useState(() => getCachedAuthedData<SchoolSetupSnapshot>(endpoint))
  const [loading, setLoading] = useState(!data)
  const [error, setError] = useState(false)
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const [now, setNow] = useState(Date.now)
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
    const timer = window.setInterval(() => setNow(Date.now()), 60000)
    const refresh = () => {
      invalidateAuthedCache(endpoint)
      void load()
    }
    window.addEventListener('focus', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      window.clearInterval(timer)
    }
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
  const publicUrl = getShareablePublicSchoolUrl(data.slug)
  const localSchoolUrl = getPublicSchoolUrl(data.slug)
  const copySchoolLink = async () => {
    try {
      await copyTextToClipboard(publicUrl)
      setShareStatus('copied')
    } catch (cause) {
      reportInternalError('SCHOOL_LINK_COPY', cause)
      setShareStatus('error')
    }
  }
  if (view === 'steps')
    return (
      <section
        aria-labelledby="school-steps-title"
        className="overflow-hidden rounded-2xl border border-(--c-border) bg-white"
      >
        <div className="p-5 sm:px-7">
          <Link
            href="/school"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-bold underline"
          >
            <FiArrowLeft aria-hidden="true" />
            Volver a Inicio
          </Link>
          <h1 id="school-steps-title" className="mt-3 text-2xl font-extrabold">
            Inicia tu escuela
          </h1>
          <p className="mt-2 text-sm text-(--c-text-2)">
            {completed}/{data.steps.length} pasos completos
          </p>
        </div>
        <div className="px-5 pb-5 sm:px-7">
          <p className="text-sm text-(--c-text-2)">
            {next
              ? 'Completa estos pasos para preparar tu escuela. Continuaremos desde donde te quedaste.'
              : 'Tu escuela está lista. Ya completaste todos los pasos de configuración.'}
          </p>
          <div className="mt-3 flex justify-end">
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
              No pudimos actualizar los pasos. Conservamos la última información; vuelve a
              intentarlo.
            </p>
          )}
        </div>
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
      </section>
    )
  return (
    <section aria-labelledby="school-home-title" className="grid gap-4">
      <h1 id="school-home-title" className="sr-only">
        Inicio de {data.schoolName}
      </h1>
      <nav aria-label="Administrar escuela" className="grid gap-3 p-2 sm:grid-cols-2">
        <Link
          href="/school/setup"
          className="flex min-h-14 min-w-0 items-center gap-3 rounded-xl border border-[var(--c-aqua)] bg-[var(--c-aqua-light)] px-4 py-3 font-bold text-(--c-ocean) shadow-[var(--shadow-sm)] transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong)"
        >
          <FiCheckCircle aria-hidden="true" className="shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block">Inicia tu escuela</span>
            <span className="mt-0.5 block text-xs font-normal">
              {completed}/{data.steps.length} pasos completos
            </span>
          </span>
          <FiArrowRight aria-hidden="true" className="shrink-0" />
        </Link>
        <Link
          href="/school/subscription"
          className="flex min-h-14 min-w-0 items-center gap-3 rounded-xl border border-(--c-border) px-4 py-3 font-bold hover:bg-(--c-surface) focus-visible:outline-2"
        >
          <FiCreditCard aria-hidden="true" className="shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block">Suscripción</span>
            <span className="mt-0.5 block text-xs font-normal text-(--c-text-2)">
              {schoolSubscriptionHint(data.subscription, now)}
            </span>
          </span>
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
      <section
        aria-labelledby="school-share-title"
        className="grid gap-4 rounded-2xl border border-(--c-border) bg-white p-5 sm:p-7"
      >
        <div>
          <h2 id="school-share-title" className="flex items-center gap-2 font-bold">
            <FiShare2 aria-hidden="true" /> Comparte tu escuela
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-(--c-text-2)">
            Puedes administrar tu escuela desde aquí. Te recomendamos abrirla e instalar la app
            desde su subdominio; después comparte este enlace con tus alumnos, profes y familias
            para que lleguen directo a tu escuela.
          </p>
        </div>
        <p className="break-all rounded-xl border border-(--c-border) bg-white px-4 py-3 text-sm text-(--c-ocean)">
          {publicUrl}
        </p>
        {shareStatus !== 'idle' && (
          <p role="status" className="text-sm font-semibold text-(--c-ocean)">
            {shareStatus === 'copied'
              ? 'Enlace copiado. Ya puedes compartirlo.'
              : 'No pudimos copiar el enlace. Inténtalo de nuevo.'}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={copySchoolLink}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-(--c-ocean) px-5 text-sm font-bold text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong)"
          >
            <FiShare2 aria-hidden="true" /> Copiar enlace
          </button>
          <Link
            href={localSchoolUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-(--c-border) bg-white px-5 text-sm font-bold text-(--c-ocean) hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong)"
          >
            Abrir mi escuela
          </Link>
        </div>
      </section>
    </section>
  )
}
