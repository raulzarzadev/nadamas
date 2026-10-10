'use client'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSchoolSelection } from '@/components/school/useSchoolSelection'
import ProfileLoadingSkeleton from '@/components/ui/profile-loading-skeleton'
import { useTenantSchool } from '@/context/TenantSchoolContext'
import { useUser } from '@/context/UserContext'
import { getAuthed } from '@/lib/client/authed-api'
import PaymentsPanel from './PaymentsPanel'

export default function PaymentsWorkspace({ mode }: { mode: 'school' | 'coach' | 'athlete' }) {
  const { selectedId, isPersonal, status } = useSchoolSelection({
    includePersonal: mode !== 'school',
    athleteMode: mode === 'athlete',
  })
  const { user } = useUser() as { user: { uid?: string; id?: string } | undefined | null }
  const tenant = useTenantSchool()
  const params = useSearchParams()
  const [coaches, setCoaches] = useState<Array<{ id: string; name: string }>>([])
  const [coachId, setCoachId] = useState(params.get('coachId') || '')
  const [loadingCoaches, setLoadingCoaches] = useState(mode === 'athlete')
  const [error, setError] = useState('')
  useEffect(() => {
    if (mode !== 'athlete') return
    let active = true
    getAuthed('/api/bookings')
      .then((response) => response.json())
      .then((payload) => {
        if (!active) return
        const map = new Map<string, string>()
        for (const booking of payload.bookings || [])
          if (!booking.schoolId && booking.coachId)
            map.set(booking.coachId, booking.coachName || 'Entrenador')
        const next = [...map].map(([id, name]) => ({ id, name }))
        if (params.get('coachId') && !next.some((coach) => coach.id === params.get('coachId')))
          next.unshift({ id: params.get('coachId') || '', name: 'Entrenador seleccionado' })
        setCoaches(next)
        setCoachId((current) => current || next[0]?.id || '')
      })
      .catch(() => {
        if (active) setError('No pudimos cargar tus entrenadores. Inténtalo de nuevo.')
      })
      .finally(() => {
        if (active) setLoadingCoaches(false)
      })
    return () => {
      active = false
    }
  }, [mode, params])
  if (status === 'loading' || !user || (mode === 'athlete' && isPersonal && loadingCoaches))
    return <ProfileLoadingSkeleton />
  if (status === 'error')
    return <p role="alert">No pudimos cargar tu espacio. Inténtalo de nuevo.</p>
  if (mode === 'coach' && (tenant || !isPersonal || params.get('schoolId')))
    return (
      <p role="status" className="text-sm">
        Los pagos de la escuela solo están disponibles en Modo Coordinador.
      </p>
    )
  const scopeSchool = params.get('coachId')
    ? null
    : params.get('schoolId') || (!isPersonal ? selectedId : null)
  const scopeCoach = mode === 'coach' ? user.uid || user.id : coachId
  const scopeEndpoint = scopeSchool
    ? `/api/payments?schoolId=${encodeURIComponent(scopeSchool)}`
    : scopeCoach
      ? `/api/payments?coachId=${encodeURIComponent(scopeCoach)}`
      : ''
  const endpoint =
    scopeEndpoint && mode === 'athlete' ? `${scopeEndpoint}&view=student` : scopeEndpoint
  return (
    <div className="grid gap-4">
      {!scopeSchool && mode === 'athlete' && (
        <label className="grid gap-1 text-sm">
          Entrenador
          <select
            className="select w-full"
            value={coachId}
            onChange={(event) => setCoachId(event.target.value)}
          >
            {!coaches.length && <option value="">Selecciona un entrenador</option>}
            {coaches.map((coach) => (
              <option key={coach.id} value={coach.id}>
                {coach.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {error && (
        <p role="alert" className="text-sm">
          {error}
        </p>
      )}
      {endpoint ? (
        <PaymentsPanel
          key={`${endpoint}:${params.get('tab') === 'orders' ? 'orders' : 'account'}`}
          endpoint={endpoint}
          initialTab={params.get('tab') === 'orders' ? 'orders' : 'account'}
        />
      ) : (
        <p className="p-3 text-sm text-(--c-text-2)">
          Selecciona una escuela o un entrenador para consultar tus pagos.
        </p>
      )}
    </div>
  )
}
