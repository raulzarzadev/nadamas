'use client'
import Image from 'next/image'
import Link from 'next/link'
import { QRCodeCanvas } from 'qrcode.react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FiActivity,
  FiArrowLeft,
  FiArrowRight,
  FiCheck,
  FiCreditCard,
  FiDollarSign,
  FiDownload,
  FiRefreshCw,
  FiSettings,
  FiShare2,
  FiShield,
} from 'react-icons/fi'
import HomeActionLink from '@/components/Home/HomeActionLink'
import Sheet from '@/components/ui/sheet'
import { SchoolSetupCRUD } from '@/firebase/school-setup/main'
import { getCachedAuthedData, invalidateAuthedCache } from '@/lib/client/authed-api'
import { copyTextToClipboard } from '@/lib/client/copy-to-clipboard'
import { getShareablePublicSchoolUrl } from '@/lib/client/school-public-url'
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
      <SetupChecklist
        key={selectedId}
        schoolId={selectedId}
        view={view}
        logoUrl={selected.school.logoUrl}
      />
    </div>
  )
}
function SetupChecklist({
  schoolId,
  view,
  logoUrl,
}: {
  schoolId: string
  view: 'home' | 'steps'
  logoUrl?: string | null
}) {
  const endpoint = `/api/schools/${encodeURIComponent(schoolId)}/setup`
  const [data, setData] = useState(() => getCachedAuthedData<SchoolSetupSnapshot>(endpoint))
  const [loading, setLoading] = useState(!data)
  const [error, setError] = useState(false)
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const [inviteExpanded, setInviteExpanded] = useState(false)
  const qrRef = useRef<HTMLCanvasElement>(null)
  const [qrError, setQrError] = useState(false)
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
  const copySchoolLink = async () => {
    try {
      await copyTextToClipboard(publicUrl)
      setShareStatus('copied')
    } catch (cause) {
      reportInternalError('SCHOOL_LINK_COPY', cause)
      setShareStatus('error')
    }
  }
  const downloadQr = async () => {
    try {
      if (!qrRef.current) throw new Error('QR_NOT_READY')
      const canvas = document.createElement('canvas')
      canvas.width = 1000
      canvas.height = 1300
      const context = canvas.getContext('2d')
      if (!context) throw new Error('QR_CANVAS_UNAVAILABLE')
      context.fillStyle = '#f0f8fa'
      context.fillRect(0, 0, 1000, 1300)
      context.fillStyle = '#ffffff'
      context.roundRect(70, 55, 860, 1190, 48)
      context.fill()
      if (logoUrl) {
        const logo = new window.Image()
        logo.src = `/_next/image?url=${encodeURIComponent(logoUrl)}&w=256&q=75`
        await logo.decode()
        context.save()
        context.beginPath()
        context.arc(500, 200, 75, 0, Math.PI * 2)
        context.clip()
        context.drawImage(logo, 425, 125, 150, 150)
        context.restore()
      } else {
        context.fillStyle = '#0a2540'
        context.beginPath()
        context.arc(500, 200, 75, 0, Math.PI * 2)
        context.fill()
        context.fillStyle = '#ffffff'
        context.font = 'bold 72px sans-serif'
        context.textAlign = 'center'
        context.fillText(data.schoolName.slice(0, 1).toUpperCase(), 500, 225)
      }
      context.fillStyle = '#0a2540'
      context.textAlign = 'center'
      context.font = 'bold 50px sans-serif'
      context.fillText(data.schoolName, 500, 360, 740)
      context.drawImage(qrRef.current, 200, 410, 600, 600)
      context.font = '30px sans-serif'
      context.fillText('Escanea para visitar nuestra escuela', 500, 1085, 750)
      context.fillStyle = '#526272'
      context.font = '26px sans-serif'
      context.fillText(publicUrl, 500, 1140, 740)
      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = `qr-escuela-${data.slug}.png`
      link.click()
      setQrError(false)
    } catch (cause) {
      reportInternalError('SCHOOL_QR_DOWNLOAD', cause)
      setQrError(true)
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
    <section aria-labelledby="school-home-title" className="grid min-w-0 max-w-full gap-4">
      <h1 id="school-home-title" className="sr-only">
        Inicio de {data.schoolName}
      </h1>
      <nav aria-label="Administrar escuela" className="grid min-w-0 gap-4 p-2">
        <HomeActionLink
          href="/school/subscription"
          title="Suscripción"
          description={schoolSubscriptionHint(data.subscription, now)}
          icon={FiCreditCard}
        />
        <section aria-labelledby="school-actions-title" className="grid min-w-0 gap-2">
          <h2
            id="school-actions-title"
            className="px-1 text-[11px] font-bold uppercase tracking-wider text-(--c-text-2)"
          >
            Tu escuela
          </h2>
          <div className="grid min-w-0 gap-2 sm:grid-cols-2">
            <HomeActionLink
              href={next ? '/school/setup' : '/school/settings'}
              title={next ? 'Termina la configuración de tu escuela' : 'Configuración'}
              description={
                next
                  ? `${completed}/${data.steps.length} pasos completos`
                  : 'Edita la información y preferencias de tu escuela'
              }
              icon={FiSettings}
              featured={Boolean(next)}
            />
            <HomeActionLink
              href="/school/payments"
              title="Planes y pagos de tu escuela"
              description="Administra los planes y cobros de tus alumnos"
              icon={FiDollarSign}
            />
            <HomeActionLink
              title="Invitar a escuela"
              dialog
              description="Comparte el enlace con tu equipo y las familias"
              icon={FiShare2}
              onClick={() => {
                setShareStatus('idle')
                setQrError(false)
                setInviteExpanded(true)
              }}
            />
          </div>
          <Sheet
            open={inviteExpanded}
            onClose={() => setInviteExpanded(false)}
            label="Invitar a escuela"
            footer={
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void downloadQr()}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-(--c-border) bg-white px-5 text-sm font-bold text-(--c-ocean) hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong)"
                >
                  <FiDownload aria-hidden="true" /> Descargar QR
                </button>
                <button
                  type="button"
                  onClick={copySchoolLink}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-(--c-ocean) px-5 text-sm font-bold text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong)"
                >
                  <FiShare2 aria-hidden="true" />{' '}
                  {shareStatus === 'copied' ? 'Enlace copiado' : 'Copiar enlace'}
                </button>
              </div>
            }
          >
            <div className="grid min-w-0 justify-items-center gap-4 pb-4 text-center">
              <h2 className="text-xl font-bold text-(--c-ocean)">Invitar a escuela</h2>
              <p className="text-sm text-(--c-text-2)">
                Comparte este código o enlace con tu equipo y las familias.
              </p>
              <div className="grid w-full max-w-72 justify-items-center gap-3 rounded-2xl border border-(--c-border) bg-(--c-surface) p-5">
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt={`Logo de ${data.schoolName}`}
                    width={64}
                    height={64}
                    className="size-16 rounded-full bg-white object-cover"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="grid size-16 place-items-center rounded-full bg-(--c-ocean) text-2xl font-bold text-white"
                  >
                    {data.schoolName.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <p className="font-bold text-(--c-ocean)">{data.schoolName}</p>
                <QRCodeCanvas
                  ref={qrRef}
                  value={publicUrl}
                  size={800}
                  marginSize={2}
                  style={{ width: 200, height: 200, maxWidth: '100%' }}
                  aria-label="Código QR para abrir la escuela"
                />
                <p className="text-xs text-(--c-text-2)">Escanea para visitar nuestra escuela</p>
              </div>
              <p className="w-full min-w-0 break-all rounded-xl border border-(--c-border) px-4 py-3 text-sm text-(--c-ocean)">
                {publicUrl}
              </p>
              {shareStatus === 'error' && (
                <p role="alert" className="text-sm text-red-800">
                  No pudimos copiar el enlace. Inténtalo de nuevo.
                </p>
              )}
              {qrError && (
                <p role="alert" className="text-sm text-red-800">
                  No pudimos descargar el QR. Inténtalo de nuevo.
                </p>
              )}
              {shareStatus === 'copied' && (
                <p role="status" className="sr-only">
                  Enlace copiado.
                </p>
              )}
            </div>
          </Sheet>
        </section>
        <section
          aria-labelledby="school-profiles-title"
          className="grid min-w-0 gap-2 border-t border-(--c-border) pt-4"
        >
          <h2
            id="school-profiles-title"
            className="px-1 text-[11px] font-bold uppercase tracking-wider text-(--c-text-2)"
          >
            Tus perfiles
          </h2>
          <div className="grid min-w-0 gap-2 sm:grid-cols-2">
            <HomeActionLink
              href="/school/coach-profile"
              title="Perfil de coach"
              description="Configura tu perfil profesional"
              icon={FiShield}
            />
            <HomeActionLink
              href="/profile"
              title="Perfil de atleta"
              description="Edita tu nombre, datos y perfil público"
              icon={FiActivity}
            />
          </div>
        </section>
      </nav>
    </section>
  )
}
