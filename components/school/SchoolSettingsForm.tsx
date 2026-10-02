'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import SchoolLogoInput from '@/components/school/SchoolLogoInput'
import { SCHOOL_TERMINOLOGY_UPDATE_EVENT } from '@/context/SchoolTerminologyContext'
import { uploadSchoolLogo } from '@/firebase/school-logos/main'
import { patchAuthed } from '@/lib/client/authed-api'
import { getPublicSchoolUrl } from '@/lib/client/school-public-url'
import {
  capitalizeSchoolTerm,
  DEFAULT_SCHOOL_PALETTE,
  normalizeSchoolTerminology,
  SCHOOL_PALETTES,
  type School,
  type SchoolCoachTerm,
  type SchoolPalette,
  type SchoolParticipantTerm,
  schoolTerminologyLabels,
} from '@/lib/school'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'

export default function SchoolSettingsForm({
  school,
  canEditSlug,
  onUpdated,
}: {
  school: School
  canEditSlug: boolean
  onUpdated: (school: School) => void
}) {
  const router = useRouter()
  const [name, setName] = useState(school.name)
  const [description, setDescription] = useState(school.description)
  const [slug, setSlug] = useState(school.slug)
  const [palette, setPalette] = useState<SchoolPalette>(school.palette || DEFAULT_SCHOOL_PALETTE)
  const [showCoaches, setShowCoaches] = useState(school.showCoaches === true)
  const [showCoachesSchedules, setShowCoachesSchedules] = useState(
    school.showCoachesSchedules === true
  )
  const [showStudents, setShowStudents] = useState(school.showStudents === true)
  const [terminology, setTerminology] = useState(() =>
    normalizeSchoolTerminology(school.terminology)
  )
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [editingLogo, setEditingLogo] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const terminologyLabels = schoolTerminologyLabels(terminology)

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
        terminology,
      })
      const payload = (await response.json()) as { school: School }
      onUpdated(payload.school)
      window.dispatchEvent(
        new CustomEvent(SCHOOL_TERMINOLOGY_UPDATE_EVENT, { detail: payload.school })
      )
      router.refresh()
      setLogoFile(null)
      setMessage('Cambios guardados.')
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
        'Completa los términos personalizados en singular y plural.',
      ]
      setMessage(safeMessages.includes(serverMessage) ? serverMessage : GENERIC_USER_ERROR)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-[var(--r-md)] border border-(--c-border) bg-white p-5 shadow-[var(--shadow-sm)]">
      <h2 className="mb-4 font-bold text-(--c-ocean)">Datos de la escuela</h2>
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
        <section className="grid gap-4 rounded-[var(--r-sm)] border border-(--c-border) p-4">
          <div>
            <h3 className="font-bold text-(--c-ocean)">Nombres en la escuela</h3>
            <p className="mt-1 text-sm font-normal text-(--c-text-2)">
              Elige cómo aparecerán en los menús, clases y mensajes.
            </p>
          </div>
          <fieldset className="grid gap-2 text-sm font-semibold text-(--c-ocean)">
            <label htmlFor="school-coach-term">¿Cómo nombras al responsable de la clase?</label>
            <select
              id="school-coach-term"
              value={terminology.coach.preset}
              onChange={(event) =>
                setTerminology((current) => ({
                  ...current,
                  coach: { ...current.coach, preset: event.target.value as SchoolCoachTerm },
                }))
              }
              className="min-h-11 rounded-[var(--r-sm)] border border-(--c-border) bg-white px-3"
            >
              <option value="entrenador">Entrenador</option>
              <option value="profesores">Profesores</option>
              <option value="coach">Coach</option>
              <option value="custom">Personalizado</option>
            </select>
            {terminology.coach.preset === 'custom' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 font-medium">
                  Singular
                  <input
                    required
                    maxLength={40}
                    value={terminology.coach.customSingular || ''}
                    onChange={(event) =>
                      setTerminology((current) => ({
                        ...current,
                        coach: { ...current.coach, customSingular: event.target.value },
                      }))
                    }
                    placeholder="Ej. instructor"
                    className="min-h-11 rounded-[var(--r-sm)] border border-(--c-border) px-3 font-normal"
                  />
                </label>
                <label className="grid gap-1 font-medium">
                  Plural
                  <input
                    required
                    maxLength={40}
                    value={terminology.coach.customPlural || ''}
                    onChange={(event) =>
                      setTerminology((current) => ({
                        ...current,
                        coach: { ...current.coach, customPlural: event.target.value },
                      }))
                    }
                    placeholder="Ej. instructores"
                    className="min-h-11 rounded-[var(--r-sm)] border border-(--c-border) px-3 font-normal"
                  />
                </label>
              </div>
            )}
          </fieldset>
          <fieldset className="grid gap-2 text-sm font-semibold text-(--c-ocean)">
            <label htmlFor="school-participant-term">
              ¿Cómo nombras a quienes participan en la clase?
            </label>
            <select
              id="school-participant-term"
              value={terminology.participant.preset}
              onChange={(event) =>
                setTerminology((current) => ({
                  ...current,
                  participant: {
                    ...current.participant,
                    preset: event.target.value as SchoolParticipantTerm,
                  },
                }))
              }
              className="min-h-11 rounded-[var(--r-sm)] border border-(--c-border) bg-white px-3"
            >
              <option value="atletas">Atletas</option>
              <option value="alumnos">Alumnos</option>
              <option value="persona">Persona</option>
              <option value="custom">Personalizado</option>
            </select>
            {terminology.participant.preset === 'custom' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 font-medium">
                  Singular
                  <input
                    required
                    maxLength={40}
                    value={terminology.participant.customSingular || ''}
                    onChange={(event) =>
                      setTerminology((current) => ({
                        ...current,
                        participant: { ...current.participant, customSingular: event.target.value },
                      }))
                    }
                    placeholder="Ej. nadador"
                    className="min-h-11 rounded-[var(--r-sm)] border border-(--c-border) px-3 font-normal"
                  />
                </label>
                <label className="grid gap-1 font-medium">
                  Plural
                  <input
                    required
                    maxLength={40}
                    value={terminology.participant.customPlural || ''}
                    onChange={(event) =>
                      setTerminology((current) => ({
                        ...current,
                        participant: { ...current.participant, customPlural: event.target.value },
                      }))
                    }
                    placeholder="Ej. nadadores"
                    className="min-h-11 rounded-[var(--r-sm)] border border-(--c-border) px-3 font-normal"
                  />
                </label>
              </div>
            )}
          </fieldset>
        </section>
        <fieldset className="grid gap-2 text-sm font-semibold text-(--c-ocean)">
          <legend>Mostrar en la página pública</legend>
          <label className="flex min-h-11 items-center gap-3 rounded-[var(--r-sm)] border border-(--c-border) bg-white px-3 font-normal">
            <input
              type="checkbox"
              checked={showCoaches}
              onChange={(event) => setShowCoaches(event.target.checked)}
              className="checkbox checkbox-sm"
            />
            {capitalizeSchoolTerm(terminologyLabels.coachPlural)}
          </label>
          <label className="flex min-h-11 items-center gap-3 rounded-[var(--r-sm)] border border-(--c-border) bg-white px-3 font-normal">
            <input
              type="checkbox"
              checked={showCoachesSchedules}
              onChange={(event) => setShowCoachesSchedules(event.target.checked)}
              className="checkbox checkbox-sm"
            />
            Horarios de {terminologyLabels.coachPlural}
          </label>
          <label className="flex min-h-11 items-center gap-3 rounded-[var(--r-sm)] border border-(--c-border) bg-white px-3 font-normal">
            <input
              type="checkbox"
              checked={showStudents}
              onChange={(event) => setShowStudents(event.target.checked)}
              className="checkbox checkbox-sm"
            />
            {capitalizeSchoolTerm(terminologyLabels.participantPlural)}
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
        <button type="submit" disabled={saving || editingLogo} className="btn btn-primary min-h-11">
          {saving && <span aria-hidden="true" className="loading loading-spinner loading-sm" />}
          {saving ? (uploadProgress != null ? 'Subiendo logo…' : 'Guardando…') : 'Guardar cambios'}
        </button>
      </form>
    </section>
  )
}
