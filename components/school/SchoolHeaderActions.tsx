'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { FiEdit3, FiX } from 'react-icons/fi'
import SchoolLogoInput from '@/components/school/SchoolLogoInput'
import { uploadSchoolLogo } from '@/firebase/school-logos/main'
import { patchAuthed } from '@/lib/client/authed-api'
import { getPublicSchoolUrl } from '@/lib/client/school-public-url'
import {
  DEFAULT_SCHOOL_PALETTE,
  SCHOOL_PALETTES,
  type School,
  type SchoolPalette,
} from '@/lib/school'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'

export default function SchoolHeaderActions({
  school,
  canEdit,
  canEditSlug,
  onUpdated,
}: {
  school: School
  canEdit: boolean
  canEditSlug: boolean
  onUpdated: (school: School) => void
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [name, setName] = useState(school.name)
  const [description, setDescription] = useState(school.description)
  const [slug, setSlug] = useState(school.slug)
  const [palette, setPalette] = useState<SchoolPalette>(school.palette || DEFAULT_SCHOOL_PALETTE)
  const [showCoaches, setShowCoaches] = useState(school.showCoaches === true)
  const [showCoachesSchedules, setShowCoachesSchedules] = useState(
    school.showCoachesSchedules === true
  )
  const [showStudents, setShowStudents] = useState(school.showStudents === true)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [editingLogo, setEditingLogo] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  function openEdit() {
    setName(school.name)
    setDescription(school.description)
    setSlug(school.slug)
    setPalette(school.palette || DEFAULT_SCHOOL_PALETTE)
    setShowCoaches(school.showCoaches === true)
    setShowCoachesSchedules(school.showCoachesSchedules === true)
    setShowStudents(school.showStudents === true)
    setLogoFile(null)
    setMessage(null)
    setEditOpen(true)
  }

  async function uploadLogo() {
    if (!logoFile) return school.logoUrl || null
    setUploadProgress(0)
    try {
      return await uploadSchoolLogo(logoFile, setUploadProgress)
    } finally {
      setUploadProgress(null)
    }
  }

  function getSaveErrorMessage(error: unknown) {
    const code = error instanceof Error ? error.message : ''
    if (code.includes('storage/unauthorized') || code.includes('storage/unauthenticated')) {
      return 'Tu sesión no permite subir el logo. Vuelve a iniciar sesión e inténtalo de nuevo.'
    }
    if (code.includes('storage/invalid-checksum') || code.includes('storage/unknown')) {
      return 'No se pudo subir el logo. Inténtalo de nuevo con otra imagen.'
    }
    return null
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const logoUrl = await uploadLogo()
      const response = await patchAuthed(`/api/schools/${school.id}`, {
        name,
        description,
        slug: canEditSlug ? slug : school.slug,
        logoUrl,
        palette,
        showCoaches,
        showCoachesSchedules,
        showStudents,
      })
      const payload = (await response.json()) as { school: School }
      onUpdated(payload.school)
      setLogoFile(null)
      setEditOpen(false)
    } catch (error) {
      reportInternalError('SCHOOL_PROFILE_UPDATE', error)
      const uploadMessage = getSaveErrorMessage(error)
      if (uploadMessage) {
        setMessage(uploadMessage)
        return
      }
      const serverMessage = error instanceof Error ? error.message : ''
      const safeMessages = [
        'Ese slug ya está en uso.',
        'Escuela no encontrada.',
        'No autenticado.',
        'No autorizado.',
        'Selecciona una paleta válida.',
      ]
      setMessage(safeMessages.includes(serverMessage) ? serverMessage : GENERIC_USER_ERROR)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="flex shrink-0 items-center gap-1">
        {canEdit && (
          <button
            type="button"
            onClick={openEdit}
            className="inline-flex min-h-8 items-center gap-1 rounded-full px-2.5 text-xs font-bold text-(--c-text-2) hover:bg-(--c-surface) hover:text-(--c-ocean)"
          >
            <FiEdit3 aria-hidden="true" /> Editar
          </button>
        )}
      </div>

      {editOpen && (
        <ModalPortal title="Editar escuela" onClose={() => setEditOpen(false)}>
          <form onSubmit={save} className="grid gap-4">
            <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
              Nombre de la escuela
              <input
                required
                maxLength={100}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="min-h-11 rounded-[var(--r-sm)] border border-(--c-border) px-3 font-normal"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
              Descripción
              <textarea
                rows={4}
                maxLength={1000}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="rounded-[var(--r-sm)] border border-(--c-border) px-3 py-2 font-normal"
              />
            </label>
            <div className="grid gap-2 text-sm font-semibold text-(--c-ocean)">
              <span>Logo de la escuela</span>
              <SchoolLogoInput
                value={logoFile}
                onChange={setLogoFile}
                currentUrl={school.logoUrl}
                disabled={saving}
                progress={uploadProgress}
                onEditingChange={setEditingLogo}
              />
            </div>
            <fieldset className="grid gap-2 text-sm font-semibold text-(--c-ocean)">
              <legend>Paleta de marca</legend>
              <div className="grid grid-cols-2 gap-2">
                {SCHOOL_PALETTES.map((option) => {
                  const selected = palette === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setPalette(option.value)}
                      className={`flex min-h-14 items-center gap-2 rounded-[var(--r-sm)] border px-3 text-left text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong) ${selected ? 'border-(--c-ocean) bg-(--c-surface)' : 'border-(--c-border) bg-white hover:bg-(--c-surface)'}`}
                    >
                      <span className="flex shrink-0 gap-0.5" aria-hidden="true">
                        <span
                          className="h-5 w-5 rounded-full"
                          style={{ backgroundColor: option.primary }}
                        />
                        <span
                          className="h-5 w-5 rounded-full"
                          style={{ backgroundColor: option.secondary }}
                        />
                        <span
                          className="h-5 w-5 rounded-full"
                          style={{ backgroundColor: option.accent }}
                        />
                      </span>
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </fieldset>
            <fieldset className="grid gap-2 text-sm font-semibold text-(--c-ocean)">
              <legend>Mostrar en la página pública</legend>
              <label className="flex min-h-11 items-center gap-3 rounded-[var(--r-sm)] border border-(--c-border) bg-white px-3 font-normal">
                <input
                  type="checkbox"
                  checked={showCoaches}
                  onChange={(event) => setShowCoaches(event.target.checked)}
                  className="checkbox checkbox-sm"
                />
                Entrenadores
              </label>
              <label className="flex min-h-11 items-center gap-3 rounded-[var(--r-sm)] border border-(--c-border) bg-white px-3 font-normal">
                <input
                  type="checkbox"
                  checked={showCoachesSchedules}
                  onChange={(event) => setShowCoachesSchedules(event.target.checked)}
                  className="checkbox checkbox-sm"
                />
                Horarios de entrenadores
              </label>
              <label className="flex min-h-11 items-center gap-3 rounded-[var(--r-sm)] border border-(--c-border) bg-white px-3 font-normal">
                <input
                  type="checkbox"
                  checked={showStudents}
                  onChange={(event) => setShowStudents(event.target.checked)}
                  className="checkbox checkbox-sm"
                />
                Alumnos
              </label>
            </fieldset>
            <div className="grid gap-3 rounded-[var(--r-sm)] bg-(--c-surface) p-3">
              <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-(--c-text-2)">
                Enlace público
                <input
                  disabled
                  value={getPublicSchoolUrl(slug)}
                  className="min-h-10 w-full cursor-not-allowed rounded-[var(--r-sm)] border border-(--c-border) bg-slate-100 px-3 text-sm font-semibold normal-case tracking-normal text-(--c-text-2) opacity-70"
                />
              </label>
              <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-(--c-text-2)">
                Slug
                <input
                  value={slug}
                  disabled={!canEditSlug}
                  onChange={(event) => setSlug(event.target.value)}
                  className={`min-h-10 w-full rounded-[var(--r-sm)] border border-(--c-border) px-3 text-sm font-semibold normal-case tracking-normal text-(--c-ocean) ${canEditSlug ? 'bg-white' : 'cursor-not-allowed bg-slate-100 opacity-70'}`}
                />
              </label>
              <p className="text-xs text-(--c-text-2)">
                {canEditSlug
                  ? 'Puedes cambiar el slug como super administrador.'
                  : 'El slug está bloqueado. Solo puede cambiarlo un super administrador.'}
              </p>
            </div>
            {message && <p className="text-sm text-(--c-error,#b91c1c)">{message}</p>}
            <button
              type="submit"
              disabled={saving || editingLogo}
              className="btn btn-primary min-h-11"
            >
              {saving && <span aria-hidden="true" className="loading loading-spinner loading-sm" />}
              {saving
                ? uploadProgress != null
                  ? 'Subiendo logo…'
                  : 'Guardando…'
                : 'Guardar cambios'}
            </button>
          </form>
        </ModalPortal>
      )}
    </>
  )
}

function ModalPortal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  if (typeof document === 'undefined') return null
  return createPortal(
    <Modal title={title} onClose={onClose}>
      {children}
    </Modal>,
    document.body
  )
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(10,37,64,0.55)] p-4 sm:items-center"
    >
      <div className="relative my-auto max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-[var(--r-md)] bg-white p-5 shadow-[var(--shadow-md)] sm:p-7">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 rounded-full p-2 text-(--c-text-2) hover:bg-(--c-surface) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong)"
        >
          <FiX aria-hidden="true" />
        </button>
        <h2 className="mb-5 pr-8 text-xl font-extrabold text-(--c-ocean)">{title}</h2>
        {children}
      </div>
    </div>
  )
}
