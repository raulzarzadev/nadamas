'use client'

import { useMemo, useState } from 'react'
import type {
  CoachClassOffering,
  CoachOfferingSchedule,
  CoachPublic,
} from '@/firebase/coaches/coach.model'
import { patchAuthed } from '@/lib/client/authed-api'
import { OFFERING_DAYS, resolveOfferings } from '@/lib/coach-offerings'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'

const DAY_KEYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export default function AdminCoachOfferingEditor({
  coachId,
  coach,
}: {
  coachId: string
  coach: CoachPublic
}) {
  const initialOfferings = useMemo(() => resolveOfferings(coach), [coach])
  const [offerings, setOfferings] = useState<CoachClassOffering[]>(initialOfferings)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const legacy = !coach.classOfferings?.length && Boolean(coach.teachingLocations?.length)

  function updateSchedule(
    offeringIndex: number,
    scheduleIndex: number,
    update: (schedule: CoachOfferingSchedule) => void
  ) {
    setOfferings((current) =>
      current.map((offering, index) => {
        if (index !== offeringIndex) return offering
        return {
          ...offering,
          schedules: (offering.schedules || []).map((schedule, slotIndex) => {
            if (slotIndex !== scheduleIndex) return schedule
            const next = { ...schedule }
            update(next)
            return next
          }),
        }
      })
    )
  }

  async function save() {
    setBusy(true)
    setNotice(null)
    try {
      await patchAuthed(`/api/admin/users/${encodeURIComponent(coachId)}`, {
        classOfferings: offerings,
      })
      setNotice('Horarios publicados actualizados.')
    } catch (error) {
      reportInternalError('ADMIN_COACH_OFFERINGS_SAVE', error)
      setNotice(GENERIC_USER_ERROR)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-5 shadow-[var(--shadow-sm)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Disponibilidad publicada</h2>
          <p className="mt-1 text-sm text-[var(--c-text-2)]">
            Edita los horarios semanales que generan las horas del perfil público.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={() => void save()}
        >
          {busy ? 'Guardando…' : 'Guardar horarios'}
        </button>
      </div>

      {legacy && (
        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          Este coach conserva horarios del formato anterior. Al guardar, se migrarán a la
          configuración actual y dejarán de depender de esos datos heredados.
        </p>
      )}

      {offerings.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--c-text-2)]">
          No hay ofertas ni horarios publicados.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {offerings.map((offering, offeringIndex) => (
            <article key={offering.id} className="rounded-xl border border-[var(--c-border)] p-4">
              <h3 className="font-bold">
                {offering.placeName || offering.coverageArea || offering.onlineDetails || 'Oferta'}
              </h3>
              {(offering.schedules || []).map((schedule, scheduleIndex) => (
                <div key={schedule.id} className="mt-3 border-t border-[var(--c-border)] pt-3">
                  <div className="flex flex-wrap gap-2">
                    {OFFERING_DAYS.map((day, dayIndex) => {
                      const value = DAY_KEYS[dayIndex]
                      const selected = schedule.days.includes(value)
                      return (
                        <label key={day} className="inline-flex items-center gap-1 text-sm">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() =>
                              updateSchedule(offeringIndex, scheduleIndex, (current) => {
                                current.days = selected
                                  ? current.days.filter((item) => item !== value)
                                  : [...current.days, value]
                              })
                            }
                          />
                          {day}
                        </label>
                      )
                    })}
                  </div>
                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-1 text-sm">
                      Inicio
                      <input
                        className="input input-bordered"
                        type="time"
                        value={schedule.startTime}
                        onChange={(event) =>
                          updateSchedule(offeringIndex, scheduleIndex, (current) => {
                            current.startTime = event.target.value
                          })
                        }
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      Fin
                      <input
                        className="input input-bordered"
                        type="time"
                        value={schedule.endTime}
                        onChange={(event) =>
                          updateSchedule(offeringIndex, scheduleIndex, (current) => {
                            current.endTime = event.target.value
                          })
                        }
                      />
                    </label>
                  </div>
                </div>
              ))}
            </article>
          ))}
        </div>
      )}
      {notice && (
        <p role="status" className="mt-3 text-sm text-[var(--c-text-2)]">
          {notice}
        </p>
      )}
    </section>
  )
}
