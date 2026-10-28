'use client'

import { useEffect, useRef, useState } from 'react'
import { FiArrowDown, FiArrowUp, FiImage, FiTrash2 } from 'react-icons/fi'
import { uploadSchoolImage } from '@/firebase/school-logos/main'
import { AuthedApiError, getAuthed, patchAuthed } from '@/lib/client/authed-api'
import { SCHOOL_PALETTES, type School, type SchoolPalette } from '@/lib/school'
import {
  DEFAULT_HOME_SECTIONS,
  homeSectionsOf,
  MAX_GALLERY_PHOTOS,
  type SchoolHomeSection,
} from '@/lib/school-home'
import { paletteFromHex, resolveSchoolPalette } from '@/lib/school-theme'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'

const SECTION_LABELS: Record<SchoolHomeSection, string> = {
  events: 'Eventos',
  gallery: 'Galería',
  contacts: 'Contacto',
}
type Patch = Partial<{
  coverUrl: string | null
  customColor: string | null
  galleryUrls: string[]
  homeSections: SchoolHomeSection[]
}>

const sectionRank = (visible: SchoolHomeSection[], section: SchoolHomeSection) =>
  visible.indexOf(section)

export default function SchoolHomeAppearanceCard({
  school,
  onUpdated,
}: {
  school: School
  onUpdated: (school: School) => void
}) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [noUpcoming, setNoUpcoming] = useState(false)
  const gallery = school.gallery ?? []
  const visible = homeSectionsOf(school)
  const rows = [...visible, ...DEFAULT_HOME_SECTIONS.filter((item) => !visible.includes(item))]
  const palette = resolveSchoolPalette(school)
  // Local value while the native picker is dragged; saved after a short pause.
  const [colorDraft, setColorDraft] = useState<string | null>(null)
  const colorTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestColor = useRef<string | null>(null)

  useEffect(
    () => () => {
      if (colorTimer.current) clearTimeout(colorTimer.current)
    },
    []
  )

  useEffect(() => {
    let active = true
    getAuthed(`/api/schools/${school.id}/events?scope=upcoming`)
      .then((response) => response.json() as Promise<{ events: unknown[] }>)
      .then((payload) => {
        if (active) setNoUpcoming(payload.events.length === 0)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [school.id])

  async function save(patch: Patch, work?: () => Promise<Patch>) {
    setBusy(true)
    setMessage(null)
    try {
      const body = work ? { ...patch, ...(await work()) } : patch
      const response = await patchAuthed(`/api/schools/${school.id}/home-settings`, body)
      const payload = (await response.json()) as { school: School }
      onUpdated({ ...school, ...payload.school })
    } catch (error) {
      if (error instanceof AuthedApiError && error.status === 400 && error.message)
        setMessage(error.message)
      else {
        reportInternalError('SCHOOL_HOME_SETTINGS_FAILED', error)
        setMessage(GENERIC_USER_ERROR)
      }
    } finally {
      setBusy(false)
    }
  }

  function changeColor(value: string) {
    latestColor.current = value
    setColorDraft(value)
    if (colorTimer.current) clearTimeout(colorTimer.current)
    colorTimer.current = setTimeout(() => {
      colorTimer.current = null
      save({ customColor: value }).then(() => {
        if (latestColor.current !== value) return
        latestColor.current = null
        setColorDraft(null)
      })
    }, 400)
  }

  async function pickPalette(palette: SchoolPalette) {
    if (colorTimer.current) clearTimeout(colorTimer.current)
    colorTimer.current = null
    latestColor.current = null
    setColorDraft(null)
    setBusy(true)
    setMessage(null)
    try {
      if (school.customColor)
        await patchAuthed(`/api/schools/${school.id}/home-settings`, { customColor: null })
      const response = await patchAuthed(`/api/schools/${school.id}`, { palette })
      const payload = (await response.json()) as { school: School }
      onUpdated({ ...school, ...payload.school, customColor: null })
    } catch (error) {
      reportInternalError('SCHOOL_HOME_SETTINGS_FAILED', error)
      setMessage(GENERIC_USER_ERROR)
    } finally {
      setBusy(false)
    }
  }

  const uploadCover = (file: File | undefined) => {
    if (!file) return
    save({}, async () => ({
      coverUrl: await uploadSchoolImage(file, 'school-covers', () => {}),
    }))
  }
  const addPhotos = (files: FileList | null) => {
    const list = Array.from(files ?? []).slice(0, MAX_GALLERY_PHOTOS - gallery.length)
    if (!list.length) return
    save({}, async () => {
      const urls = await Promise.all(
        list.map((file) => uploadSchoolImage(file, 'school-gallery', () => {}))
      )
      return { galleryUrls: [...gallery.map((photo) => photo.url), ...urls] }
    })
  }
  const saveSections = (next: SchoolHomeSection[]) => save({ homeSections: next })
  const toggle = (section: SchoolHomeSection) =>
    saveSections(
      visible.includes(section) ? visible.filter((item) => item !== section) : [...visible, section]
    )
  const move = (section: SchoolHomeSection, direction: -1 | 1) => {
    const next = [...visible]
    const from = next.indexOf(section)
    const to = from + direction
    if (from < 0 || to < 0 || to >= next.length) return
    next.splice(to, 0, ...next.splice(from, 1))
    saveSections(next)
  }

  const hints = [
    !school.coverUrl && 'Agrega una foto de portada',
    gallery.length === 0 && 'Sube algunas fotos a la galería',
    noUpcoming && 'Publica tu próximo evento',
  ].filter(Boolean) as string[]

  return (
    <section
      aria-busy={busy}
      className="min-w-0 rounded-(--r-md) border border-(--c-border) bg-white p-5 shadow-(--shadow-sm)"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-(--c-surface) text-(--c-ocean)">
          <FiImage aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="font-bold text-(--c-ocean)">Apariencia de tu página</h2>
          <p className="mt-1 text-sm text-(--c-text-2)">
            Portada, color, galería y orden de lo que ven tus visitantes.
          </p>
        </div>
      </div>

      {hints.length > 0 && (
        <div className="mt-4 rounded-(--r-sm) bg-(--c-surface) p-3">
          <h3 className="text-sm font-bold text-(--c-ocean)">Para completar tu página</h3>
          <ul className="mt-1 list-disc pl-5 text-sm text-(--c-text-2)">
            {hints.map((hint) => (
              <li key={hint}>{hint}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 grid gap-2">
        <h3 className="text-sm font-bold text-(--c-ocean)">Foto de portada</h3>
        {school.coverUrl && (
          // biome-ignore lint/performance/noImgElement: remote storage preview
          <img
            src={school.coverUrl}
            alt="Portada actual"
            className="aspect-video w-full rounded-(--r-sm) object-cover"
          />
        )}
        <div className="flex flex-wrap gap-2">
          <label className="btn btn-outline btn-sm min-h-11 cursor-pointer">
            {school.coverUrl ? 'Cambiar foto' : 'Subir foto'}
            <input
              type="file"
              accept="image/*"
              aria-label="Subir foto de portada"
              disabled={busy}
              className="sr-only"
              onChange={(event) => {
                uploadCover(event.target.files?.[0])
                event.target.value = ''
              }}
            />
          </label>
          {school.coverUrl && (
            <button
              type="button"
              disabled={busy}
              onClick={() => save({ coverUrl: null })}
              className="btn btn-ghost btn-sm min-h-11"
            >
              Quitar
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-2">
        <h3 className="text-sm font-bold text-(--c-ocean)">Color</h3>
        <div className="flex flex-wrap items-center gap-2">
          {SCHOOL_PALETTES.map((item) => {
            const selected = !school.customColor && (school.palette ?? 'ocean') === item.value
            return (
              <button
                key={item.value}
                type="button"
                disabled={busy}
                aria-pressed={selected}
                aria-label={item.label}
                title={item.label}
                onClick={() => {
                  if (!selected) pickPalette(item.value)
                }}
                className={`size-11 rounded-full border-2 ${selected ? 'border-(--c-ocean) ring-2 ring-(--c-ocean)/30' : 'border-white ring-1 ring-(--c-border)'}`}
                style={{ backgroundColor: item.primary }}
              />
            )
          })}
          <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-(--c-ocean)">
            Color propio
            <input
              type="color"
              aria-label="Color propio"
              value={colorDraft ?? school.customColor ?? palette.primary}
              onChange={(event) => changeColor(event.target.value)}
              className="size-11 cursor-pointer rounded-full border border-(--c-border) bg-white p-0"
            />
          </label>
        </div>
        {school.customColor && (
          <p className="text-xs text-(--c-text-2)">
            Usamos {paletteFromHex(school.customColor).primary} para que el texto se lea bien.
          </p>
        )}
      </div>

      <div className="mt-5 grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-(--c-ocean)">Galería</h3>
          <span className="text-xs text-(--c-text-2)">
            {gallery.length} de {MAX_GALLERY_PHOTOS}
          </span>
        </div>
        {gallery.length > 0 && (
          <ul className="grid grid-cols-3 gap-2">
            {gallery.map((photo, index) => (
              <li key={photo.id} className="relative">
                {/* biome-ignore lint/performance/noImgElement: remote storage preview */}
                <img
                  src={photo.url}
                  alt={`Foto ${index + 1} de la galería`}
                  className="aspect-square w-full rounded-(--r-sm) object-cover"
                />
                <button
                  type="button"
                  disabled={busy}
                  aria-label={`Quitar foto ${index + 1}`}
                  onClick={() =>
                    save({
                      galleryUrls: gallery.filter((item) => item.id !== photo.id).map((p) => p.url),
                    })
                  }
                  className="absolute top-1 right-1 grid size-11 place-items-center rounded-full bg-white/90 text-rose-700"
                >
                  <FiTrash2 aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {gallery.length < MAX_GALLERY_PHOTOS && (
          <label className="btn btn-outline btn-sm min-h-11 w-fit cursor-pointer">
            Agregar fotos
            <input
              type="file"
              accept="image/*"
              multiple
              aria-label="Agregar fotos a la galería"
              disabled={busy}
              className="sr-only"
              onChange={(event) => {
                addPhotos(event.target.files)
                event.target.value = ''
              }}
            />
          </label>
        )}
      </div>

      <div className="mt-5 grid gap-2">
        <h3 className="text-sm font-bold text-(--c-ocean)">Secciones de tu página</h3>
        <ul className="grid gap-2">
          {rows.map((section) => {
            const label = SECTION_LABELS[section]
            const shown = visible.includes(section)
            const rank = sectionRank(visible, section)
            return (
              <li
                key={section}
                className="flex flex-wrap items-center gap-2 rounded-(--r-sm) bg-(--c-surface) px-3 py-1"
              >
                <span className="min-w-0 flex-1 text-sm font-semibold text-(--c-ocean)">
                  {label}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={shown}
                  aria-label={`Mostrar ${label}`}
                  disabled={busy}
                  onClick={() => toggle(section)}
                  className="btn btn-ghost btn-sm min-h-11"
                >
                  {shown ? 'Visible' : 'Oculta'}
                </button>
                <button
                  type="button"
                  aria-label={`Subir ${label}`}
                  disabled={busy || !shown || rank <= 0}
                  onClick={() => move(section, -1)}
                  className="btn btn-ghost size-11 p-0"
                >
                  <FiArrowUp aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`Bajar ${label}`}
                  disabled={busy || !shown || rank >= visible.length - 1}
                  onClick={() => move(section, 1)}
                  className="btn btn-ghost size-11 p-0"
                >
                  <FiArrowDown aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {message && (
        <p role="status" className="mt-3 text-sm text-(--c-text-2)">
          {message}
        </p>
      )}
    </section>
  )
}
