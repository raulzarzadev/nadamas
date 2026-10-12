'use client'

import { useEffect, useState } from 'react'
import { FiEdit2, FiPlus } from 'react-icons/fi'
import AthleteCredentialButton from '@/components/profile/AthleteCredentialButton'
import PersonFields from '@/components/profile/PersonFields'
import Sheet from '@/components/ui/sheet'
import { type AdditionalProfile, validProfileBirthDate } from '@/lib/additional-profile'
import { getAuthed, patchAuthed, postAuthed } from '@/lib/client/authed-api'

type AdditionalProfileForm = {
  name: string
  birthDate: string
  gender: AdditionalProfile['gender']
}

const EMPTY_FORM: AdditionalProfileForm = { name: '', birthDate: '', gender: 'varonil' }

export default function AdditionalProfiles() {
  const [profiles, setProfiles] = useState<AdditionalProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [formError, setFormError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<AdditionalProfile | null>(null)
  const [form, setForm] = useState<AdditionalProfileForm>(EMPTY_FORM)

  useEffect(() => {
    getAuthed('/api/additional-profiles')
      .then((r) => r.json())
      .then((p) => setProfiles(p.profiles || []))
      .catch(() => setMessage('No se pudieron cargar tus Adicionales.'))
      .finally(() => setLoading(false))
  }, [])

  function openCreateModal() {
    setEditingProfile(null)
    setForm(EMPTY_FORM)
    setMessage('')
    setFormError('')
    setModalOpen(true)
  }

  function openEditModal(profile: AdditionalProfile) {
    setEditingProfile(profile)
    setForm({ name: profile.name, birthDate: profile.birthDate || '', gender: profile.gender })
    setMessage('')
    setFormError('')
    setModalOpen(true)
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if ((!editingProfile || form.birthDate) && !validProfileBirthDate(form.birthDate)) {
      setFormError('La fecha de nacimiento debe ser válida y no puede ser posterior a hoy.')
      return
    }
    setSaving(true)
    setMessage('')
    setFormError('')
    try {
      const response = editingProfile
        ? await patchAuthed(
            `/api/additional-profiles/${encodeURIComponent(editingProfile.id)}`,
            form
          )
        : await postAuthed('/api/additional-profiles', form)
      const { profile } = (await response.json()) as { profile: AdditionalProfile }
      setProfiles((current) =>
        editingProfile
          ? current.map((item) => (item.id === profile.id ? profile : item))
          : [...current, profile].sort((a, b) => a.name.localeCompare(b.name))
      )
      setModalOpen(false)
      setEditingProfile(null)
      setForm(EMPTY_FORM)
      setMessage(
        editingProfile
          ? 'Adicional actualizado.'
          : 'Adicional creado. Puedes seleccionarlo al aceptar una invitación de escuela.'
      )
    } catch {
      setFormError(
        editingProfile
          ? 'No se pudo actualizar el Adicional. Revisa los datos e inténtalo de nuevo.'
          : 'No se pudo crear el Adicional. Revisa los datos e inténtalo de nuevo.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section
      className="grid gap-4 rounded-[var(--r-md)] border border-(--c-border) bg-white p-5"
      aria-labelledby="additional-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="additional-title" className="text-lg font-bold">
            Adicionales
          </h2>
          <p className="mt-1 text-sm text-(--c-text-2)">
            Crea perfiles para gestionar personas adultas o menores desde tu cuenta. Cada Adicional
            tiene sus propios datos y clases.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          disabled={loading}
          className="btn btn-primary min-h-11"
        >
          <FiPlus aria-hidden="true" /> Agregar Adicional
        </button>
      </div>

      {loading ? (
        <p>Cargando Adicionales…</p>
      ) : profiles.length ? (
        <ul className="grid gap-2">
          {profiles.map((profile) => (
            <li
              key={profile.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-sm)] bg-(--c-surface) p-3"
            >
              <div>
                <strong>{profile.name}</strong>
                <span className="block text-sm text-(--c-text-2)">
                  Adicional · {profile.birthDate || 'Fecha de nacimiento no registrada'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <AthleteCredentialButton profileId={profile.id} />
                <button
                  type="button"
                  onClick={() => openEditModal(profile)}
                  className="btn btn-outline min-h-11"
                >
                  <FiEdit2 aria-hidden="true" /> Editar Adicional
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-(--c-text-2)">
          Aún no tienes Adicionales. Agrega a la primera persona.
        </p>
      )}

      {message && (
        <p role="status" className="text-sm text-(--c-text-2)">
          {message}
        </p>
      )}

      <Sheet
        open={modalOpen}
        onClose={() => {
          if (!saving) setModalOpen(false)
        }}
        label={editingProfile ? 'Editar Adicional' : 'Agregar Adicional'}
        keyboardAware
        fullBleedMobile
      >
        <form onSubmit={submit} className="grid gap-4 px-4 pb-3 sm:px-0 sm:pb-0">
          <div>
            <h3 className="text-xl font-bold text-(--c-ocean)">
              {editingProfile ? 'Editar Adicional' : 'Agregar Adicional'}
            </h3>
            <p className="mt-1 text-sm text-(--c-text-2)">
              {editingProfile
                ? 'Actualiza sus datos. La fecha de nacimiento es opcional.'
                : 'Agrega los datos de la persona que administrarás desde tu cuenta.'}
            </p>
          </div>
          <PersonFields
            value={form}
            onChange={setForm}
            fields={['name', 'birthDate', 'gender']}
            required={editingProfile ? ['name'] : ['name', 'birthDate']}
            disabled={saving}
          />
          {formError && (
            <p role="alert" className="text-sm text-(--c-error,#b91c1c)">
              {formError}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              disabled={saving}
              className="btn btn-outline min-h-11"
            >
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary min-h-11">
              {saving ? 'Guardando…' : editingProfile ? 'Guardar cambios' : 'Crear Adicional'}
            </button>
          </div>
        </form>
      </Sheet>
    </section>
  )
}
