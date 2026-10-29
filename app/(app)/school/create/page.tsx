'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { FiArrowLeft, FiArrowRight, FiCheck, FiMapPin } from 'react-icons/fi'
import SchoolLogoInput from '@/components/school/SchoolLogoInput'
import { useUser } from '@/context/UserContext'
import { uploadSchoolLogo } from '@/firebase/school-logos/main'
import { getAuthed, postAuthed } from '@/lib/client/authed-api'
import { getPublicSchoolUrl } from '@/lib/client/school-public-url'
import { DEFAULT_SCHOOL_TIMEZONE, SCHOOL_TIMEZONE_OPTIONS, type School } from '@/lib/school'
import { slugify } from '@/lib/slug'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'

type FormState = {
  name: string
  slug: string
  description: string
  timezone: string
}

const INITIAL_FORM: FormState = {
  name: '',
  slug: '',
  description: '',
  timezone: DEFAULT_SCHOOL_TIMEZONE,
}

export default function CreateSchoolPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const creatingAdditional = searchParams.get('new') === '1'
  const [loadError, setLoadError] = useState(false)
  const [revision, setRevision] = useState(0)
  const { user } = useUser() as { user: { uid?: string; id?: string } | null }
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [editingLogo, setEditingLogo] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [ownedSchool, setOwnedSchool] = useState<School | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<'idle' | 'saving' | 'error' | 'success'>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [slugTouched, setSlugTouched] = useState(false)

  useEffect(() => {
    void revision
    let active = true
    setLoading(true)
    setLoadError(false)
    getAuthed('/api/schools', 15000)
      .then((response) => response.json() as Promise<{ ownedSchool?: School | null }>)
      .then((payload) => {
        if (active) setOwnedSchool(payload.ownedSchool || null)
      })
      .catch((error) => {
        reportInternalError('SCHOOL_CREATE_LOAD', error)
        if (active) setLoadError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [revision])

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function updateName(value: string) {
    setForm((current) => ({
      ...current,
      name: value,
      slug: slugTouched ? current.slug : slugify(value),
    }))
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status === 'saving') return
    const uid = user?.uid || user?.id
    if (!uid) return
    if (form.name.trim().length < 2 || form.slug.trim().length < 3) {
      setStatus('error')
      setMessage('Completa el nombre y el slug de tu escuela.')
      return
    }

    setStatus('saving')
    setMessage(null)
    let logoUrl: string | null = null
    try {
      if (logoFile) {
        setUploadProgress(0)
        logoUrl = await uploadSchoolLogo(logoFile, setUploadProgress)
      }
    } catch (error) {
      reportInternalError('SCHOOL_LOGO_UPLOAD', error)
      setStatus('error')
      setMessage('No se pudo subir el logo. Inténtalo de nuevo.')
      return
    } finally {
      setUploadProgress(null)
    }

    try {
      const response = await postAuthed('/api/schools', {
        ...form,
        name: form.name.trim(),
        slug: slugify(form.slug),
        description: form.description.trim(),
        logoUrl,
      })
      const payload = (await response.json()) as { school: School }
      setOwnedSchool(payload.school)
      try {
        window.localStorage.setItem('nadamas.schoolId', payload.school.id)
      } catch (error) {
        reportInternalError('SCHOOL_SELECTION_SAVE', error)
      }
      window.dispatchEvent(new Event('nadamas:school-access-updated'))
      setStatus('success')
      setMessage('Tu escuela quedó creada.')
      router.replace(`/school/create?created=${encodeURIComponent(payload.school.id)}`)
    } catch (error) {
      reportInternalError('SCHOOL_CREATE', error)
      setStatus('error')
      const safeMessage = error instanceof Error ? error.message : ''
      setMessage(
        ['Ese slug ya está en uso.', 'Ya tienes una escuela creada.'].includes(safeMessage)
          ? safeMessage
          : GENERIC_USER_ERROR
      )
    }
  }

  if (loading) {
    return <div className="py-16 text-center text-sm text-(--c-text-2)">Cargando…</div>
  }

  if (loadError)
    return (
      <section className="mx-auto max-w-2xl p-6" role="alert">
        <h1 className="text-xl font-bold">No pudimos cargar tus escuelas</h1>
        <p className="mt-3 text-sm">Inténtalo de nuevo para continuar sin repetir la creación.</p>
        <button
          type="button"
          className="btn btn-primary mt-4 min-h-11"
          onClick={() => setRevision((value) => value + 1)}
        >
          Volver a intentar
        </button>
      </section>
    )

  if (ownedSchool && (!creatingAdditional || status === 'success')) {
    return (
      <section className="mx-auto flex max-w-2xl flex-col gap-5">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-(--c-ocean-mid)"
        >
          <FiArrowLeft aria-hidden="true" /> Regresar al inicio
        </Link>
        <div className="overflow-hidden rounded-[var(--r-md)] border border-(--c-border) bg-white shadow-[var(--shadow-sm)]">
          <div className="bg-(--c-ocean) px-6 py-8 text-white sm:px-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-(--c-aqua-light)">
              Modo escuela
            </p>
            <h1 className="mt-2 text-3xl font-extrabold">{ownedSchool.name}</h1>
            <p className="mt-2 text-white/75">
              Tu escuela ya está creada. Continúa con su configuración.
            </p>
          </div>
          <div className="flex flex-col gap-4 p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-3 rounded-[var(--r-sm)] bg-(--c-surface) p-4">
              <div className="flex min-w-0 flex-1 basis-48 items-center gap-3">
                <FiMapPin aria-hidden="true" className="shrink-0 text-(--c-ocean-mid)" />
                <div className="min-w-0">
                  <p className="font-bold text-(--c-ocean)">Página pública</p>
                  <p className="break-all text-sm text-(--c-text-2)">{ownedSchool.slug}.nadamas.app</p>
                </div>
              </div>
              <Link href={getPublicSchoolUrl(ownedSchool.slug)} className="btn btn-primary min-h-11 shrink-0 gap-2">
                Ir a escuela <FiArrowRight aria-hidden="true" />
              </Link>
            </div>
            <p className="text-sm leading-relaxed text-(--c-text-2)">
              Tu siguiente paso es configurar un plan de pago. Después crea los horarios de clases y
              agrega a tus profes y alumnos.
            </p>
            <Link href="/school/subscription" className="btn btn-outline min-h-11 w-full">
              Ver suscripción y acceso
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-5">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-semibold text-(--c-ocean-mid)"
      >
        <FiArrowLeft aria-hidden="true" /> Regresar al inicio
      </Link>
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--c-aqua-strong)">
          Modo escuela
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-(--c-ocean)">Crea tu escuela</h1>
        <p className="mt-2 max-w-xl text-(--c-text-2)">
          Presenta tu comunidad, invita a tus profesores y organiza las clases desde un solo lugar.
        </p>
      </div>

      <div className="rounded-xl border border-(--c-border) bg-white p-4 text-sm">
        <p className="font-bold">$299 MXN al mes por escuela · todos sus profesores incluidos</p>
        {ownedSchool && (
          <p className="mt-2 text-(--c-text-2)">
            Las escuelas adicionales requieren una suscripción desde el inicio. Puedes crearla y
            activar su acceso desde Suscripción.
          </p>
        )}
      </div>
      <form
        onSubmit={submit}
        className="flex flex-col gap-5 rounded-[var(--r-md)] border border-(--c-border) bg-white p-5 shadow-[var(--shadow-sm)] sm:p-7"
      >
        <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-(--c-ocean)">
          Nombre de la escuela
          <input
            required
            value={form.name}
            onChange={(event) => updateName(event.target.value)}
            maxLength={100}
            placeholder="Ej. Escuela de Natación Coyoacán"
            className="min-h-12 w-full min-w-0 rounded-[var(--r-sm)] border border-(--c-border) bg-white px-3 text-base font-normal outline-none transition focus:border-(--c-aqua-strong) focus:ring-2 focus:ring-(--c-aqua-light)"
          />
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-(--c-ocean)">
          Slug de la escuela
          <span className="flex min-h-12 min-w-0 items-center rounded-[var(--r-sm)] border border-(--c-border) bg-(--c-surface) px-3 text-sm font-normal text-(--c-text-2)">
            <input
              required
              value={form.slug}
              onChange={(event) => {
                setSlugTouched(true)
                updateField('slug', slugify(event.target.value))
              }}
              maxLength={40}
              placeholder="mi-escuela"
              className="min-w-0 flex-1 bg-transparent px-1 font-semibold text-(--c-ocean) outline-none"
            />
            <span className="shrink-0">.nadamas.app</span>
          </span>
          <span className="font-normal text-(--c-text-2)">
            Este será el dominio que podrás compartir en redes sociales y enlaces.
          </span>
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-(--c-ocean)">
          Descripción
          <textarea
            value={form.description}
            onChange={(event) => updateField('description', event.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="Cuéntale a las familias qué hace especial a tu escuela."
            className="[field-sizing:content] min-h-20 rounded-[var(--r-sm)] border border-(--c-border) bg-white px-3 py-3 text-base font-normal outline-none transition focus:border-(--c-aqua-strong) focus:ring-2 focus:ring-(--c-aqua-light)"
          />
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-(--c-ocean)">
          Zona horaria
          <select
            value={form.timezone}
            onChange={(event) => updateField('timezone', event.target.value)}
            className="min-h-12 w-full min-w-0 rounded-[var(--r-sm)] border border-(--c-border) bg-white px-3 text-base font-normal outline-none transition focus:border-(--c-aqua-strong) focus:ring-2 focus:ring-(--c-aqua-light)"
          >
            {SCHOOL_TIMEZONE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} ({option.value})
              </option>
            ))}
          </select>
        </label>

        <div className="grid min-w-0 gap-1.5 text-sm font-semibold text-(--c-ocean)">
          <span>Logo</span>
          <SchoolLogoInput
            value={logoFile}
            onChange={setLogoFile}
            disabled={status === 'saving'}
            progress={uploadProgress}
            onEditingChange={setEditingLogo}
          />
        </div>

        {message && (
          <p
            className={`flex items-center gap-2 text-sm ${status === 'success' ? 'text-(--c-success,#0a7d4b)' : 'text-(--c-error,#b91c1c)'}`}
          >
            {status === 'success' && <FiCheck aria-hidden="true" />}
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'saving' || editingLogo}
          className="btn btn-primary min-h-12 w-full text-base disabled:opacity-60"
        >
          {status === 'saving' && (
            <span aria-hidden="true" className="loading loading-spinner loading-sm" />
          )}
          {status === 'saving'
            ? uploadProgress != null
              ? 'Subiendo logo…'
              : 'Creando escuela…'
            : 'Crear escuela'}
        </button>
      </form>
    </section>
  )
}
