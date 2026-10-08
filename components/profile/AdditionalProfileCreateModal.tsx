'use client'

import { useId, useState } from 'react'
import DateInput from '@/components/ui/date-input'
import GenderSelector from '@/components/ui/gender-selector'
import Sheet from '@/components/ui/sheet'
import { type AdditionalProfile, validProfileBirthDate } from '@/lib/additional-profile'
import { postAuthed } from '@/lib/client/authed-api'

export default function AdditionalProfileCreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (profile: AdditionalProfile) => void
}) {
  const formId = useId()
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState<AdditionalProfile['gender']>('varonil')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (saving) return
    if (name.trim().length < 2 || !validProfileBirthDate(birthDate)) {
      setError('Completa el nombre y una fecha de nacimiento válida.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const response = await postAuthed('/api/additional-profiles', {
        name: name.trim(),
        birthDate,
        gender,
      })
      const payload = (await response.json()) as { profile: AdditionalProfile }
      onCreated(payload.profile)
    } catch {
      setError('No pudimos crear el Adicional. Revisa los datos e inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }
  const fieldClass =
    'min-h-12 rounded-[var(--r-sm)] border border-(--c-border) bg-white px-3 font-normal focus:outline-2 focus:outline-(--c-aqua-strong)'
  return (
    <Sheet
      open
      onClose={onClose}
      label="Agregar Adicional"
      keyboardAware
      fullBleedMobile
      closeDisabled={saving}
      showFooterClose={false}
      footer={
        <div className="flex flex-col-reverse gap-2 border-t border-(--c-border) px-4 pt-3 sm:flex-row sm:justify-end sm:px-0">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="btn btn-outline min-h-12"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form={formId}
            disabled={saving}
            className="btn btn-primary min-h-12"
          >
            {saving ? 'Guardando…' : 'Crear y seleccionar'}
          </button>
        </div>
      }
    >
      <form id={formId} onSubmit={submit} className="grid gap-4 px-4 pb-4 sm:px-0">
        <div>
          <h2 className="text-xl font-bold text-(--c-ocean)">Agregar Adicional</h2>
          <p className="mt-1 text-sm text-(--c-text-2)">
            Crea un perfil para otra persona. Quedará seleccionado para inscribirlo en este horario
            al confirmar la reserva.
          </p>
        </div>
        <label className="grid gap-1 text-sm font-semibold">
          Nombre completo
          <input
            required
            minLength={2}
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={fieldClass}
          />
        </label>
        <DateInput
          label="Fecha de nacimiento"
          required
          value={birthDate}
          onChange={setBirthDate}
          max={new Date().toLocaleDateString('en-CA')}
        />
        <GenderSelector value={gender} onChange={setGender} disabled={saving} />
        {error && (
          <p role="alert" className="text-sm text-(--c-error,#b91c1c)">
            {error}
          </p>
        )}
      </form>
    </Sheet>
  )
}
