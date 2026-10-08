'use client'

import { useEffect, useState } from 'react'
import Sheet from '@/components/ui/sheet'
import { getAuthed } from '@/lib/client/authed-api'

type Profile = {
  id?: string
  athleteId?: string
  name: string
  email?: string | null
  studentEmail?: string
  phone?: string
  address?: string
  birthDate?: string
  guardianName?: string
  guardianPhone?: string
  guardianEmail?: string
  totalClasses?: number
}

export default function StudentProfileModal({
  studentId,
  schoolId,
  name,
  onClose,
}: {
  studentId: string
  schoolId?: string
  name: string
  onClose: () => void
}) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    const endpoint = schoolId
      ? `/api/schools/${encodeURIComponent(schoolId)}/students?includeAgendaStudents=true`
      : '/api/coach/students'
    getAuthed(endpoint)
      .then((response) => response.json())
      .then((payload: { students?: Profile[] }) => {
        if (!active) return
        const found = payload.students?.find(
          (student) => student.id === studentId || student.athleteId === studentId
        )
        if (found) setProfile(found)
        else setError('No pudimos encontrar los datos de este atleta.')
      })
      .catch(() => {
        if (active) setError('No pudimos cargar el perfil. Inténtalo de nuevo.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [studentId, schoolId])
  return (
    <Sheet open onClose={onClose} label="Perfil del atleta">
      <div className="grid gap-4 pb-4">
        <h2 className="text-xl font-bold">Perfil del atleta</h2>
        <h3 className="text-lg font-bold">{profile?.name || name}</h3>
        {loading && (
          <p role="status" className="text-sm">
            Cargando perfil…
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm">
            {error}
          </p>
        )}
        {profile && (
          <dl className="grid gap-3 rounded-xl border border-(--c-border) bg-(--c-surface) p-4 text-sm">
            {[
              ['Correo', profile.studentEmail || profile.email],
              ['Teléfono', profile.phone],
              ['Fecha de nacimiento', profile.birthDate],
              ['Dirección', profile.address],
              ['Responsable', profile.guardianName],
              ['Teléfono del responsable', profile.guardianPhone],
              ['Correo del responsable', profile.guardianEmail],
              [
                'Clases registradas contigo',
                profile.totalClasses === undefined ? undefined : String(profile.totalClasses),
              ],
            ].map(([label, value]) =>
              value ? (
                <div key={label}>
                  <dt className="text-xs text-(--c-text-2)">{label}</dt>
                  <dd className="break-words font-semibold">{value}</dd>
                </div>
              ) : null
            )}
          </dl>
        )}
      </div>
    </Sheet>
  )
}
