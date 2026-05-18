'use client'
import IconInfo from '@comps/IconInfo'
import SaveButton from '@comps/SaveButton'
import { useEffect, useState } from 'react'
import { CARD_PROPIERTIES_AND_STYLES_LABEL } from '@/CONSTANTS/LABELS'
import { useAutosave } from '@/hooks/useAutosave'
import { type CoachMetrics, normalizeCoachMetrics } from '@/lib/coach-metrics'
import CoachMetricsForm from './CoachMetricsForm'
import { CoachStyleMapPreview } from './CoachRadarChart'
import ProfileSection from './ProfileSection'

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

  const { status: autoStatus, saveNow } = useAutosave(JSON.stringify(draft), () => onSave(draft))

  return (
    <ProfileSection
      title={CARD_PROPIERTIES_AND_STYLES_LABEL}
      description="No hay respuestas buenas o malas: la compatibilidad nace de mostrar tu estilo real."
      summary={`8 métricas · ${CARD_PROPIERTIES_AND_STYLES_LABEL}`}
      headerAside={
        <div className="pointer-events-none absolute right-10 top-1/2 -translate-y-1/2 sm:right-12">
          <CoachStyleMapPreview metrics={draft} />
        </div>
      }
      allowOverflow
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--c-text-2)]">
        <span>¿Cómo funciona?</span>
        <IconInfo
          type="info"
          label="Cómo funciona la carta de estilo"
          content="Ajusta tu estilo de entrenamiento para que los alumnos entiendan de un vistazo cómo acompañas, corriges y exiges."
        />
      </div>

      <CoachMetricsForm value={draft} onChange={setDraft} />

      <div className="flex border-t border-[var(--c-border)] pt-4 sm:justify-end">
        <SaveButton
          status={saving ? 'saving' : autoStatus}
          onClick={saveNow}
          idleLabel="Guardado"
          savedLabel="Guardado"
        />
      </div>
    </ProfileSection>
  )
}
