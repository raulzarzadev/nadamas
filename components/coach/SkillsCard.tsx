'use client'
import { useEffect, useState } from 'react'
import CoachMetricsForm from './CoachMetricsForm'
import { CoachStyleMapPreview } from './CoachRadarChart'
import ProfileSection from './ProfileSection'
import {
  normalizeCoachMetrics,
  type CoachMetrics,
} from '@/lib/coach-metrics'

export default function SkillsCard({
  value,
  saving,
  onSave,
}: {
  value?: Partial<CoachMetrics>
  saving: boolean
  onSave: (metrics: CoachMetrics) => void
}) {
  const [draft, setDraft] = useState<CoachMetrics>(normalizeCoachMetrics(value))

  useEffect(() => {
    setDraft(normalizeCoachMetrics(value))
  }, [value])

  return (
    <ProfileSection
      title="Carta de gustos y habilidades"
      description="Ajusta tu estilo de entrenamiento para que los alumnos entiendan de un vistazo cómo acompañas, corriges y exiges."
      summary="8 métricas · mapa de estilo"
      headerAside={
        <div className="pointer-events-none absolute right-10 top-1/2 -translate-y-1/2 sm:right-12">
          <CoachStyleMapPreview metrics={draft} />
        </div>
      }
      allowOverflow
    >
      <CoachMetricsForm value={draft} onChange={setDraft} />

      <div className="flex flex-col gap-3 border-t border-[var(--c-border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--c-text-2)]">
          No hay respuestas buenas o malas: la compatibilidad nace de mostrar tu estilo real.
        </p>
        <button
          type="button"
          disabled={saving}
          onClick={() => onSave(draft)}
          className="btn btn-primary min-w-36 self-start disabled:opacity-50 sm:self-auto"
        >
          {saving ? 'Guardando…' : 'Guardar carta'}
        </button>
      </div>
    </ProfileSection>
  )
}
