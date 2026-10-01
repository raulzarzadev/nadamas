'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { FiArrowLeft, FiCheck, FiMapPin } from 'react-icons/fi'
import SchoolLogoInput from '@/components/school/SchoolLogoInput'
import { useUser } from '@/context/UserContext'
import { uploadSchoolLogo } from '@/firebase/school-logos/main'
import { getAuthed, postAuthed } from '@/lib/client/authed-api'
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
    getAuthed('/api/schools')
      .then((response) => response.json() as Promise<{ ownedSchool?: School | null }>)
      .then((payload) => setOwnedSchool(payload.ownedSchool || null))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

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
      setStatus('success')
      setMessage('Tu escuela quedó creada.')
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

  if (ownedSchool) {
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
            <p className="mt-2 text-white/75">Ya tienes una escuela creada y eres su director.</p>
          </div>
          <div className="flex flex-col gap-4 p-6 sm:p-8">
            <div className="flex items-center gap-3 rounded-[var(--r-sm)] bg-(--c-surface) p-4">
              <FiMapPin aria-hidden="true" className="shrink-0 text-(--c-ocean-mid)" />
              <div>
                <p className="font-bold text-(--c-ocean)">Página pública</p>
                <p className="text-sm text-(--c-text-2)">{ownedSchool.slug}.nadamas.app</p>
              </div>
            </div>
            <Link href={`/school/${ownedSchool.slug}`} className="btn btn-primary min-h-11 w-full">
              Ver página pública
            </Link>
            <p className="text-center text-xs text-(--c-text-2)">
              Cuando el dominio esté configurado también estará disponible en{' '}
              <strong>{ownedSchool.slug}.nadamas.app</strong>.
            </p>
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
            También será la base de tu subdominio.
          </span>
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-(--c-ocean)">
          Descripción
          <textarea
            value={form.description}
            onChange={(event) => updateField('description', event.target.value)}
            maxLength={1000}
            rows={4}
            placeholder="Cuéntale a las familias qué hace especial a tu escuela."
            className="rounded-[var(--r-sm)] border border-(--c-border) bg-white px-3 py-3 text-base font-normal outline-none transition focus:border-(--c-aqua-strong) focus:ring-2 focus:ring-(--c-aqua-light)"
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
